import { RadarCandidate, RadarCandidateSchema } from "./schemas.js";

export const defaultCandidates: RadarCandidate[] = [
  { niche: "Emergency plumbers", region: "South Africa", demandSignal: 7, urgencySignal: 9, averageTransactionSignal: 6, whatsappFit: 8, paymentReadiness: 6, competitionGap: 5, compliantChannelFit: 8, evidence: ["Urgent repair work rewards rapid response", "Community-led opt-in launch available"] },
  { niche: "Boiler and heating engineers", region: "United Kingdom", demandSignal: 7, urgencySignal: 8, averageTransactionSignal: 7, whatsappFit: 7, paymentReadiness: 8, competitionGap: 6, compliantChannelFit: 7, evidence: ["Seasonal service demand can create response bottlenecks", "Hosted payment links are familiar"] },
  { niche: "Solar maintenance contractors", region: "Australia", demandSignal: 6, urgencySignal: 5, averageTransactionSignal: 8, whatsappFit: 7, paymentReadiness: 8, competitionGap: 6, compliantChannelFit: 6, evidence: ["High-value quotes benefit from fast professional presentation", "English-language self-serve onboarding"] }
];

export function score(candidate: RadarCandidate) {
  const c = RadarCandidateSchema.parse(candidate);
  return Number((c.demandSignal * 0.2 + c.urgencySignal * 0.2 + c.averageTransactionSignal * 0.15 + c.whatsappFit * 0.12 + c.paymentReadiness * 0.12 + c.competitionGap * 0.1 + c.compliantChannelFit * 0.11).toFixed(2));
}

export function chooseCandidate(candidates = defaultCandidates) {
  return candidates.map((candidate) => ({ ...candidate, score: score(candidate) })).sort((a, b) => b.score - a.score)[0];
}
