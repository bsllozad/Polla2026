import { describe, expect, it } from "vitest";
import { calculateMatchPoints } from "@/domain/scoring/matchScoring";
import { MatchResult, Prediction } from "@/shared/types/worldcup";

const basePrediction: Prediction = {
  participantId: "p1",
  matchId: "m1",
  homeScore: 0,
  awayScore: 0,
  createdAt: "2026-06-11T12:00:00Z"
};

const result = (homeScore: number, awayScore: number): MatchResult => ({
  matchId: "m1",
  homeScore,
  awayScore,
  scorerIds: [],
  status: "finished"
});

describe("calculateMatchPoints", () => {
  it("gives 5 for exact score", () => {
    expect(calculateMatchPoints({ ...basePrediction, homeScore: 2, awayScore: 1 }, result(2, 1))).toBe(5);
  });

  it("gives 3 for winner with one goal distance", () => {
    expect(calculateMatchPoints({ ...basePrediction, homeScore: 2, awayScore: 0 }, result(2, 1))).toBe(3);
  });

  it("gives 1 for winner only", () => {
    expect(calculateMatchPoints({ ...basePrediction, homeScore: 3, awayScore: 0 }, result(1, 0))).toBe(1);
  });

  it("gives 3 for draw one goal per side away", () => {
    expect(calculateMatchPoints({ ...basePrediction, homeScore: 1, awayScore: 1 }, result(2, 2))).toBe(3);
  });

  it("gives 2 for other non-exact draw", () => {
    expect(calculateMatchPoints({ ...basePrediction, homeScore: 0, awayScore: 0 }, result(2, 2))).toBe(2);
  });
});
