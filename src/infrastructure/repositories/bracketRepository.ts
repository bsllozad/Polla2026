import { listMatches } from "@/infrastructure/repositories/matchesRepository";
import { supabase } from "@/infrastructure/supabase/client";
import { Match } from "@/shared/types/worldcup";

type ResultRow = {
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  status: "finished" | "invalid";
};

type MatchTeamRow = {
  id: string;
  fifa_match_no: number | null;
  stage: string;
  home_team_id: string | null;
  away_team_id: string | null;
};

type StandingRow = {
  teamId: string;
  groupName: string;
  played: number;
  points: number;
  wins: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type BracketTeamUpdate = {
  matchId: string;
  homeTeamId?: string;
  awayTeamId?: string;
};

async function listResultRows(): Promise<ResultRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("match_results")
    .select("match_id, home_score, away_score, status");

  if (error) throw error;

  return (data ?? []) as ResultRow[];
}

function resultMap(results: ResultRow[]) {
  return new Map(results.map((result) => [result.match_id, result]));
}

function applyMatchToStandings(match: Match, result: ResultRow, standings: Map<string, StandingRow>) {
  if (result.status !== "finished" || result.home_score === null || result.away_score === null) return;
  if (!match.homeTeam.groupName || !match.awayTeam.groupName) return;

  const home = standings.get(match.homeTeam.id) ?? {
    teamId: match.homeTeam.id,
    groupName: match.homeTeam.groupName,
    played: 0,
    points: 0,
    wins: 0,
    goalsFor: 0,
    goalsAgainst: 0
  };
  const away = standings.get(match.awayTeam.id) ?? {
    teamId: match.awayTeam.id,
    groupName: match.awayTeam.groupName,
    played: 0,
    points: 0,
    wins: 0,
    goalsFor: 0,
    goalsAgainst: 0
  };

  home.played += 1;
  away.played += 1;
  home.goalsFor += result.home_score;
  home.goalsAgainst += result.away_score;
  away.goalsFor += result.away_score;
  away.goalsAgainst += result.home_score;

  if (result.home_score > result.away_score) {
    home.points += 3;
    home.wins += 1;
  } else if (result.away_score > result.home_score) {
    away.points += 3;
    away.wins += 1;
  } else {
    home.points += 1;
    away.points += 1;
  }

  standings.set(home.teamId, home);
  standings.set(away.teamId, away);
}

function rankStandings(rows: StandingRow[]) {
  return [...rows].sort((left, right) => {
    const points = right.points - left.points;
    if (points) return points;
    const goalDifference = (right.goalsFor - right.goalsAgainst) - (left.goalsFor - left.goalsAgainst);
    if (goalDifference) return goalDifference;
    const goalsFor = right.goalsFor - left.goalsFor;
    if (goalsFor) return goalsFor;
    return right.wins - left.wins;
  });
}

export async function updateBracketMatchTeams(input: BracketTeamUpdate): Promise<void> {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { data, error } = await supabase
    .from("matches")
    .update({
      home_team_id: input.homeTeamId || null,
      away_team_id: input.awayTeamId || null
    })
    .eq("id", input.matchId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No se actualizo el cruce. Revisa permisos de superadmin o el id del partido.");
}

export async function applyRound32Proposal(): Promise<void> {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const [matches, results] = await Promise.all([listMatches({ limit: 104, showAll: true }), listResultRows()]);
  const resultsByMatch = resultMap(results);
  const standings = new Map<string, StandingRow>();

  matches
    .filter((match) => match.stage === "group")
    .forEach((match) => {
      const result = resultsByMatch.get(match.id);
      if (result) applyMatchToStandings(match, result, standings);
    });

  const byGroup = new Map<string, StandingRow[]>();
  for (const row of standings.values()) {
    const groupRows = byGroup.get(row.groupName) ?? [];
    groupRows.push(row);
    byGroup.set(row.groupName, groupRows);
  }

  const rankedGroups = new Map([...byGroup.entries()].map(([group, rows]) => [group, rankStandings(rows)]));
  const bestThirds = rankStandings([...rankedGroups.values()].map((rows) => rows[2]).filter(Boolean));
  const usedThirdGroups = new Set<string>();

  function resolveSlot(slot?: string) {
    if (!slot) return undefined;

    const direct = slot.match(/^([12])([A-L])$/);
    if (direct) {
      const position = Number(direct[1]) - 1;
      return rankedGroups.get(direct[2])?.[position]?.teamId;
    }

    const third = slot.match(/^3([A-L]+)$/);
    if (third) {
      const allowedGroups = new Set(third[1].split(""));
      const team = bestThirds.find((row) => allowedGroups.has(row.groupName) && !usedThirdGroups.has(row.groupName));
      if (!team) return undefined;
      usedThirdGroups.add(team.groupName);
      return team.teamId;
    }

    return undefined;
  }

  const round32 = matches.filter((match) => match.stage === "round_32");
  for (const match of round32) {
    const homeTeamId = resolveSlot(match.homeSlot);
    const awayTeamId = resolveSlot(match.awaySlot);
    if (homeTeamId || awayTeamId) {
      await updateBracketMatchTeams({
        matchId: match.id,
        homeTeamId: homeTeamId ?? (match.homeTeam.id === match.homeSlot ? undefined : match.homeTeam.id),
        awayTeamId: awayTeamId ?? (match.awayTeam.id === match.awaySlot ? undefined : match.awayTeam.id)
      });
    }
  }
}

export async function advanceKnockoutSlots(matchId: string, status: "finished" | "invalid", homeScore: number, awayScore: number, penaltyWinnerTeamId?: string): Promise<void> {
  if (!supabase || status !== "finished") return;

  const { data, error } = await supabase
    .from("matches")
    .select("id, fifa_match_no, stage, home_team_id, away_team_id")
    .eq("id", matchId)
    .maybeSingle();

  if (error) throw error;
  const match = data as MatchTeamRow | null;
  if (!match?.fifa_match_no || match.stage === "group" || !match.home_team_id || !match.away_team_id) return;

  const winnerId = homeScore === awayScore ? penaltyWinnerTeamId : homeScore > awayScore ? match.home_team_id : match.away_team_id;
  if (!winnerId) return;

  const loserId = winnerId === match.home_team_id ? match.away_team_id : match.home_team_id;

  const winnerSlot = `W${match.fifa_match_no}`;
  const loserSlot = `L${match.fifa_match_no}`;

  const { error: homeWinnerError } = await supabase
    .from("matches")
    .update({ home_team_id: winnerId })
    .eq("home_slot", winnerSlot);
  if (homeWinnerError) throw homeWinnerError;

  const { error: awayWinnerError } = await supabase
    .from("matches")
    .update({ away_team_id: winnerId })
    .eq("away_slot", winnerSlot);
  if (awayWinnerError) throw awayWinnerError;

  if (match.stage !== "semi_final") return;

  const { error: homeLoserError } = await supabase
    .from("matches")
    .update({ home_team_id: loserId })
    .eq("home_slot", loserSlot);
  if (homeLoserError) throw homeLoserError;

  const { error: awayLoserError } = await supabase
    .from("matches")
    .update({ away_team_id: loserId })
    .eq("away_slot", loserSlot);
  if (awayLoserError) throw awayLoserError;
}
