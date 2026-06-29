import { describe, expect, it } from "vitest";
import { calculateMatchPoints, calculatePredictionScore } from "@/domain/scoring/matchScoring";
import { MatchResult, Player, Prediction } from "@/shared/types/worldcup";

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

describe("calculatePredictionScore", () => {
  it("adds 2 points when penalty winner matches after a draw prediction", () => {
    const score = calculatePredictionScore(
      { ...basePrediction, homeScore: 1, awayScore: 1, penaltyWinnerTeamId: "home" },
      { ...result(2, 2), penaltyWinnerTeamId: "home" },
      new Map()
    );

    expect(score.matchPoints).toBe(3);
    expect(score.penaltyBonus).toBe(2);
    expect(score.total).toBe(5);
  });

  it("does not add penalty bonus when regular-time scores are not both draws", () => {
    const score = calculatePredictionScore(
      { ...basePrediction, homeScore: 2, awayScore: 1, penaltyWinnerTeamId: "home" },
      { ...result(2, 2), penaltyWinnerTeamId: "home" },
      new Map()
    );

    expect(score.penaltyBonus).toBe(0);
  });

  it("adds bonuses for selected scorers from both teams", () => {
    const homeScorer: Player = {
      id: "home-scorer",
      teamId: "home",
      fullName: "Home Midfielder",
      position: "attacking_midfielder"
    };
    const awayScorer: Player = {
      id: "away-scorer",
      teamId: "away",
      fullName: "Away Forward",
      position: "forward"
    };
    const score = calculatePredictionScore(
      { ...basePrediction, homeScore: 2, awayScore: 1, homeScorerId: homeScorer.id, awayScorerId: awayScorer.id },
      { ...result(4, 1), scorerIds: [homeScorer.id, awayScorer.id] },
      new Map([
        [homeScorer.id, homeScorer],
        [awayScorer.id, awayScorer]
      ])
    );

    expect(score.scorerBonus).toBe(8);
    expect(score.total).toBe(9);
  });
});
