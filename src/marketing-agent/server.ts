import express from "express";
import cors from "cors";
import path from "node:path";
import dotenv from "dotenv";
import {
  generateMarketingContent,
  logProgressAndSync,
  generateXprizeNarrativeSection,
  getGovernanceProfile,
  generateFullXprizeAuditPackage,
  evaluateJudgePrompt,
  SUPPORTED_PERSONAS
} from "./agent.js";
import {
  getLogs,
  getCampaigns,
  getMilestones,
  getHackathonDoc,
  updateHackathonDoc,
  syncHackathonDoc,
  DATA_DIR
} from "./storage.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.MARKETING_PORT || process.env.ORA_AGENT_PORT || 8085);

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(process.cwd(), "src", "marketing-agent", "public")));

// --- Marketing & Persona Endpoints ---

app.get("/api/marketing/personas", (_req, res) => {
  res.json({ success: true, personas: SUPPORTED_PERSONAS });
});

app.post("/api/marketing/generate", async (req, res) => {
  try {
    const { brand, persona, lifecycleStage, channel, topic, tone, keyPoints, ctaUrl } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Missing required field 'topic'" });
    }
    const campaign = await generateMarketingContent({
      brand: brand || "Ora",
      persona: persona || "field_contractor",
      lifecycleStage: lifecycleStage || "awareness",
      channel: channel || "x_twitter",
      topic,
      tone: tone || "build_in_public",
      keyPoints,
      ctaUrl
    });
    res.json({ success: true, campaign });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate marketing content" });
  }
});

app.get("/api/marketing/campaigns", async (_req, res) => {
  try {
    const campaigns = await getCampaigns();
    res.json({ success: true, campaigns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Enterprise AI Governance & XPRIZE Compliance Endpoints ---

// Get live governance profile (Watsonx standard + GCP service breakdown)
app.get("/api/governance/status", (_req, res) => {
  try {
    const profile = getGovernanceProfile();
    res.json({ success: true, profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Interactive Sandbox Evaluator for XPRIZE Judges
app.post("/api/governance/evaluate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt required for evaluation" });
    }
    const result = await evaluateJudgePrompt(prompt);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export Full XPRIZE Audit Package (Markdown + JSON)
app.get("/api/governance/export-report", async (req, res) => {
  try {
    const format = (req.query.format as string) || "markdown";
    const auditPackage = await generateFullXprizeAuditPackage();

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="xprize-audit-report-${Date.now()}.json"`);
      return res.send(JSON.stringify(auditPackage.jsonSummary, null, 2));
    }

    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="XPRIZE_AUDIT_REPORT_${Date.now()}.md"`);
    res.send(auditPackage.markdownReport);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Milestones, Progress & XPRIZE Doc Endpoints ---

app.get("/api/milestones", async (_req, res) => {
  try {
    const milestones = await getMilestones();
    res.json({ success: true, milestones });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/milestones", async (req, res) => {
  try {
    const { title, description, category, metrics } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: "Missing required fields 'title' or 'description'" });
    }
    const result = await logProgressAndSync(title, description, category || "feature", metrics);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/xprize-doc", async (_req, res) => {
  try {
    const markdown = await getHackathonDoc();
    res.json({ success: true, markdown });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/xprize-doc", async (req, res) => {
  try {
    const { markdown } = req.body;
    if (typeof markdown !== "string") {
      return res.status(400).json({ error: "Markdown string required" });
    }
    await updateHackathonDoc(markdown);
    res.json({ success: true, message: "Updated successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/xprize-doc/sync", async (_req, res) => {
  try {
    const markdown = await syncHackathonDoc();
    res.json({ success: true, markdown });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/narrative", async (req, res) => {
  try {
    const { sectionTitle, bulletNotes } = req.body;
    const narrative = await generateXprizeNarrativeSection(sectionTitle || "Overview", bulletNotes || []);
    res.json({ success: true, narrative });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/logs", async (_req, res) => {
  try {
    const logs = await getLogs();
    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Ora Marketing & XPRIZE Governance Agent Running`);
  console.log(`🌐 Dashboard URL: http://localhost:${PORT}`);
  console.log(`🛡️ AI Governance: IBM watsonx.governance standards active`);
  console.log(`📂 Isolated Data: ${DATA_DIR}`);
  console.log(`======================================================\n`);
});
