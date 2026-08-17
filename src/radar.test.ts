import { describe, expect, it } from "vitest";
import { chooseCandidate, score } from "./radar.js";

describe("Market Radar", () => {
  it("weights urgency and compliant channel fit into a reproducible score", () => {
    const winner = chooseCandidate();
    expect(winner.score).toBe(score(winner));
    expect(winner.evidence.length).toBeGreaterThan(0);
  });
});
