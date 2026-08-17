import { z } from "zod";

export const QuoteSchema = z.object({
  businessName: z.string().min(1),
  businessEmail: z.string().email().optional(),
  customerName: z.string().min(1),
  customerContact: z.string().optional(),
  jobDescription: z.string().min(5),
  currency: z.string().length(3).default("ZAR"),
  lineItems: z.array(z.object({ description: z.string().min(1), quantity: z.number().positive(), unitPrice: z.number().nonnegative() })).min(1),
  depositPercent: z.number().min(0).max(100).default(0),
  validUntil: z.string().optional(),
  notes: z.string().optional()
});

export type Quote = z.infer<typeof QuoteSchema>;
export const DemoRequestSchema = z.object({
  businessName: z.string().min(2).max(120),
  customerName: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(32).optional(),
  currency: z.string().length(3).default("ZAR"),
  message: z.string().min(8).max(4000),
  optedIn: z.literal(true, { errorMap: () => ({ message: "Consent is required before we create your demo." }) })
});

export const RadarCandidateSchema = z.object({
  niche: z.string().min(2), region: z.string().min(2), demandSignal: z.number().min(0).max(10),
  urgencySignal: z.number().min(0).max(10), averageTransactionSignal: z.number().min(0).max(10),
  whatsappFit: z.number().min(0).max(10), paymentReadiness: z.number().min(0).max(10),
  competitionGap: z.number().min(0).max(10), compliantChannelFit: z.number().min(0).max(10), evidence: z.array(z.string()).max(8)
});
export type RadarCandidate = z.infer<typeof RadarCandidateSchema>;
