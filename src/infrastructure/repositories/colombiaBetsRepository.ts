import { supabase } from "@/infrastructure/supabase/client";
import { isColombiaPollaClosed } from "@/features/colombia-polla/colombiaPollaConfig";

export type ColombiaBetInput = {
  participantId: string;
  questionKey: string;
  answerText?: string;
  selectedTeamId?: string;
  selectedPlayerId?: string;
  numericAnswer?: number;
};

export type StoredColombiaBet = ColombiaBetInput;

type ColombiaBetRow = {
  participant_id: string;
  question_key: string;
  answer_text: string | null;
  selected_team_id: string | null;
  selected_player_id: string | null;
  numeric_answer: number | null;
};

export async function listColombiaBetsByParticipant(participantId?: string): Promise<Record<string, StoredColombiaBet>> {
  if (!supabase || !participantId) return {};

  const { data, error } = await supabase
    .from("colombia_bets")
    .select("participant_id, question_key, answer_text, selected_team_id, selected_player_id, numeric_answer")
    .eq("participant_id", participantId);

  if (error) throw error;

  return ((data ?? []) as ColombiaBetRow[]).reduce<Record<string, StoredColombiaBet>>((acc, row) => {
    acc[row.question_key] = {
      participantId: row.participant_id,
      questionKey: row.question_key,
      answerText: row.answer_text ?? undefined,
      selectedTeamId: row.selected_team_id ?? undefined,
      selectedPlayerId: row.selected_player_id ?? undefined,
      numericAnswer: row.numeric_answer ?? undefined
    };
    return acc;
  }, {});
}

export async function saveColombiaBets(inputs: ColombiaBetInput[]): Promise<void> {
  if (!supabase) throw new Error("Supabase no esta configurado.");
  if (isColombiaPollaClosed) throw new Error("La polla Colombia ya esta cerrada.");
  if (inputs.length === 0) return;

  const rows = inputs.map((input) => ({
    participant_id: input.participantId,
    question_key: input.questionKey,
    answer_text: input.answerText || null,
    selected_team_id: input.selectedTeamId || null,
    selected_player_id: input.selectedPlayerId || null,
    numeric_answer: input.numericAnswer ?? null,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase.from("colombia_bets").upsert(rows, {
    onConflict: "participant_id,question_key"
  });

  if (error) throw error;
}
