import { supabase } from "@/infrastructure/supabase/client";

export type PredictionInput = {
  participantId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  homeScorerId?: string;
  awayScorerId?: string;
};

export type StoredPrediction = PredictionInput;

type PredictionRow = {
  participant_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  home_scorer_id: string | null;
  away_scorer_id: string | null;
};

export async function listPredictionsByParticipant(participantId?: string): Promise<Record<string, StoredPrediction>> {
  if (!supabase || !participantId) return {};

  const { data, error } = await supabase
    .from("predictions")
    .select("participant_id, match_id, home_score, away_score, home_scorer_id, away_scorer_id")
    .eq("participant_id", participantId);

  if (error) throw error;

  return ((data ?? []) as PredictionRow[]).reduce<Record<string, StoredPrediction>>((acc, row) => {
    acc[row.match_id] = {
      participantId: row.participant_id,
      matchId: row.match_id,
      homeScore: row.home_score,
      awayScore: row.away_score,
      homeScorerId: row.home_scorer_id ?? undefined,
      awayScorerId: row.away_scorer_id ?? undefined
    };
    return acc;
  }, {});
}

export async function savePrediction(input: PredictionInput): Promise<void> {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { error } = await supabase.from("predictions").upsert(
    {
      participant_id: input.participantId,
      match_id: input.matchId,
      home_score: input.homeScore,
      away_score: input.awayScore,
      home_scorer_id: input.homeScorerId || null,
      away_scorer_id: input.awayScorerId || null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "participant_id,match_id" }
  );

  if (error) throw error;
}
