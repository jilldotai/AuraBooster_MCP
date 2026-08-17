import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DemoRequestSchema } from "./schemas.js";
import { audit, recentAudit } from "./audit.js";
import { makeQuote, campaignCopy } from "./gemini.js";
import { quotePdf } from "./pdf.js";
import { chooseCandidate, defaultCandidates } from "./radar.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors()); app.use(express.json({ limit: "2mb" })); app.use(express.static(path.join(__dirname, "../public")));

const demoQuotes = new Map<string, { quote: Awaited<ReturnType<typeof makeQuote>>["quote"]; businessName: string; createdAt: string; approved: boolean; paymentLink?: string }>();
const optedOut = new Set<string>();
const paymentTemplate = process.env.PAYMENT_LINK_TEMPLATE;
const adminToken = process.env.ADMIN_TOKEN;
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!adminToken) return res.status(503).json({ error: "Set ADMIN_TOKEN in Cloud Run Secret Manager before using the owner dashboard." });
  if (req.header("authorization") !== `Bearer ${adminToken}`) return res.status(401).json({ error: "Owner authorization required." });
  next();
}

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "jill-revenue-agent", persistence: process.env.GOOGLE_CLOUD_PROJECT ? "firestore" : "memory" }));
app.get("/api/admin/audit", requireAdmin, async (_req, res) => res.json(await recentAudit()));
app.get("/api/admin/status", requireAdmin, (_req, res) => res.json({
  environment: process.env.GOOGLE_CLOUD_PROJECT ? "Google Cloud / Firestore" : "local memory mode",
  gemini: Boolean(process.env.GOOGLE_CLOUD_PROJECT), whatsapp: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
  paymentLink: Boolean(paymentTemplate), eftFallback: Boolean(process.env.EFT_BANK_DETAILS), adminProtection: true,
  quotes: [...demoQuotes.entries()].map(([id, q]) => ({ id, businessName: q.businessName, createdAt: q.createdAt, approved: q.approved, paymentLink: Boolean(q.paymentLink) }))
}));
app.get("/api/radar", async (_req, res) => res.json({ candidates: defaultCandidates, winner: chooseCandidate() }));

app.post("/api/radar/run", async (_req, res) => {
  const winner = chooseCandidate();
  const assets = await campaignCopy(winner);
  await audit({ actor: "agent", type: "market_radar.run", status: "requires_approval", inputClass: "aggregate-permitted-signals", summary: `Selected ${winner.niche} / ${winner.region} (${winner.score})`, metadata: { winner, assets, policy: "No personal data, scraping, paid spend, or autonomous publishing." } });
  res.json({ winner, assets, approvalRequired: true });
});

app.post("/api/demo", async (req, res) => {
  const parsed = DemoRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const input = parsed.data;
  if ((input.email && optedOut.has(input.email)) || (input.phone && optedOut.has(input.phone))) return res.status(403).json({ error: "This contact has opted out." });
  const result = await makeQuote({ businessName: input.businessName, customerName: input.customerName, message: input.message, currency: input.currency });
  const id = `JRA-${randomUUID().slice(0, 8).toUpperCase()}`;
  demoQuotes.set(id, { quote: result.quote, businessName: input.businessName, createdAt: new Date().toISOString(), approved: false });
  await audit({ actor: "agent", type: "revenue_operator.demo_quote", status: "requires_approval", inputClass: "opted-in-demo", summary: `Created non-binding quote draft ${id} via ${result.mode}`, businessId: input.businessName, artifactId: id, metadata: { currency: input.currency, customerProvided: Boolean(input.customerName), consent: true } });
  res.status(201).json({ id, quote: result.quote, explanation: result.explanation, approvalRequired: true, pdfUrl: `/api/quotes/${id}.pdf` });
});

app.get("/api/quotes/:id.pdf", async (req, res) => {
  const record = demoQuotes.get(req.params.id); if (!record) return res.status(404).json({ error: "Quote not found" });
  const pdf = await quotePdf(record.quote, req.params.id);
  res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `inline; filename=${req.params.id}.pdf`); res.send(pdf);
});

app.post("/api/quotes/:id/approve", async (req, res) => {
  const record = demoQuotes.get(req.params.id); if (!record) return res.status(404).json({ error: "Quote not found" });
  if (req.body?.approved !== true) return res.status(400).json({ error: "Explicit business approval is required." });
  record.approved = true;
  const amount = record.quote.lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  record.paymentLink = paymentTemplate ? paymentTemplate.replaceAll("{reference}", req.params.id).replaceAll("{amount}", amount.toFixed(2)) : undefined;
  await audit({ actor: "human", type: "quote.approved", status: "completed", inputClass: "explicit-business-approval", summary: `Approved quote ${req.params.id}`, businessId: record.businessName, artifactId: req.params.id, metadata: { paymentLinkCreated: Boolean(record.paymentLink) } });
  res.json({ approved: true, paymentLink: record.paymentLink || null, eftFallbackConfigured: Boolean(process.env.EFT_BANK_DETAILS) });
});

app.post("/api/opt-out", async (req, res) => {
  const contact = String(req.body?.contact || "").trim(); if (!contact) return res.status(400).json({ error: "A contact is required." });
  optedOut.add(contact); await audit({ actor: "system", type: "contact.opt_out", status: "completed", inputClass: "consent-withdrawal", summary: "Suppressed future follow-ups", metadata: { contactHash: Buffer.from(contact).toString("base64") } }); res.status(204).end();
});

// Meta webhook verification; inbound processing deliberately creates a draft only, never a marketing send.
app.get("/webhooks/whatsapp", (req, res) => {
  if (req.query["hub.verify_token"] === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(req.query["hub.challenge"]);
  return res.sendStatus(403);
});
app.post("/webhooks/whatsapp", async (req, res) => { await audit({ actor: "system", type: "whatsapp.inbound", status: "created", inputClass: "inbound-message", summary: "Inbound WhatsApp event received; manual/consent gate applies", metadata: { object: req.body?.object || "unknown" } }); res.sendStatus(200); });

// Express 5 requires a named wildcard parameter.
app.get("/{*splat}", (_req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));
const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`Jill Revenue Agent listening on ${port}`));
