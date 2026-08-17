import { GoogleGenAI } from "@google/genai";
import { Quote, QuoteSchema } from "./schemas.js";

const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
function client() {
  return new GoogleGenAI({ vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: process.env.GOOGLE_CLOUD_LOCATION || "global" });
}

function extractJson(text: string): unknown {
  const block = text.match(/\{[\s\S]*\}/)?.[0];
  if (!block) throw new Error("Gemini did not return structured content.");
  return JSON.parse(block);
}

export async function makeQuote(input: { businessName: string; customerName?: string; message: string; currency: string }): Promise<{ quote: Quote; explanation: string; mode: "gemini" | "safe-fallback" }> {
  const prompt = `You are Jill Revenue Agent. Convert this opt-in contractor job note into a conservative NON-BINDING quote draft. Never invent prices, taxes, legal terms, customer contact information, or payment details. If price is unknown set unitPrice to 0 and say it needs business approval. Return JSON only with {quote:{businessName,customerName,jobDescription,currency,lineItems:[{description,quantity,unitPrice}],depositPercent,notes},explanation}. Business: ${input.businessName}; customer: ${input.customerName || "Customer"}; currency: ${input.currency}; note: ${input.message}`;
  try {
    const response = await client().models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", temperature: 0.15 } });
    const parsed = extractJson(response.text || "");
    const value = parsed as { quote: unknown; explanation?: string };
    return { quote: QuoteSchema.parse(value.quote), explanation: value.explanation || "Review every amount before sending.", mode: "gemini" };
  } catch {
    return {
      quote: QuoteSchema.parse({ businessName: input.businessName, customerName: input.customerName || "Customer", jobDescription: input.message, currency: input.currency, lineItems: [{ description: "Work to be confirmed from submitted job note", quantity: 1, unitPrice: 0 }], depositPercent: 0, notes: "DEMO / PRO FORMA ONLY. Amounts and terms require business approval." }),
      explanation: "Your draft is ready. Add approved prices before sending it to a customer.", mode: "safe-fallback"
    };
  }
}

export async function campaignCopy(winner: { niche: string; region: string; score: number; evidence: string[] }) {
  const prompt = `Create consent-first community launch assets for Jill Revenue Agent. No cold WhatsApp/SMS, no promises, no scraping. Market: ${winner.niche} in ${winner.region}. Evidence: ${winner.evidence.join("; ")}. Return JSON only {videoHook,landingHeadline,communityQuestion,replyDraft,whyNow}.`;
  try { const r = await client().models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", temperature: 0.5 } }); return extractJson(r.text || ""); }
  catch { return { videoHook: `From site voice note to quote in minutes for ${winner.niche}.`, landingHeadline: "Your first quote draft, free.", communityQuestion: `How much time do ${winner.niche} spend on quotes after work?`, replyDraft: "If you want to test a free non-binding demo, reply and I will send the opt-in link.", whyNow: winner.evidence.join("; ") }; }
}
