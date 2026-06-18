import { colombiaQuestions } from "@/features/colombia-polla/colombiaQuestions";
import { supabase } from "@/infrastructure/supabase/client";

export type ColombiaOfficialAnswerInput = {
  questionKey: string;
  answerText?: string;
  selectedTeamId?: string;
  selectedPlayerId?: string;
  numericAnswer?: number;
  isClosed: boolean;
};

export type ColombiaAnswerValue = {
  answerText?: string;
  selectedTeamId?: string;
  selectedPlayerId?: string;
  numericAnswer?: number;
  label: string;
};

export type ColombiaResultDetail = {
  questionKey: string;
  label: string;
  points: number;
  isClosed: boolean;
  userAnswer?: ColombiaAnswerValue;
  officialAnswer?: ColombiaAnswerValue;
  earnedPoints: number;
};

type ColombiaAnswerRow = {
  question_key: string;
  answer_text: string | null;
  selected_team_id: string | null;
  selected_player_id: string | null;
  numeric_answer: number | null;
  points: number;
  is_closed?: boolean;
};

type ColombiaBetRow = {
  participant_id: string;
  question_key: string;
  answer_text: string | null;
  selected_team_id: string | null;
  selected_player_id: string | null;
  numeric_answer: number | null;
};

type NameRow = {
  id: string;
  full_name?: string;
  name?: string;
  code?: string;
  flag_emoji?: string | null;
};

function normalizeAnswer(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAnswerValue(answer?: ColombiaAnswerRow | ColombiaBetRow) {
  return Boolean(answer?.answer_text || answer?.selected_team_id || answer?.selected_player_id || answer?.numeric_answer !== null);
}

function buildValue(row: ColombiaAnswerRow | ColombiaBetRow | undefined, playerNames: Map<string, string>, teamNames: Map<string, string>): ColombiaAnswerValue | undefined {
  if (!row || !hasAnswerValue(row)) return undefined;

  const selectedPlayerId = row.selected_player_id ?? undefined;
  const selectedTeamId = row.selected_team_id ?? undefined;
  const numericAnswer = row.numeric_answer ?? undefined;
  const answerText = row.answer_text ?? undefined;

  let label = answerText ?? "";
  if (selectedPlayerId) label = playerNames.get(selectedPlayerId) ?? label;
  if (selectedTeamId) label = teamNames.get(selectedTeamId) ?? label;
  if (numericAnswer !== undefined) label = String(numericAnswer);

  return {
    answerText,
    selectedTeamId,
    selectedPlayerId,
    numericAnswer,
    label: label || "Sin respuesta"
  };
}

function isCorrectBet(bet: ColombiaBetRow | undefined, answer: ColombiaAnswerRow) {
  if (!bet || !answer.is_closed || !hasAnswerValue(answer)) return false;

  if (answer.selected_player_id) {
    return bet.selected_player_id === answer.selected_player_id || normalizeAnswer(bet.answer_text) === normalizeAnswer(answer.answer_text);
  }

  if (answer.selected_team_id) {
    return bet.selected_team_id === answer.selected_team_id || normalizeAnswer(bet.answer_text) === normalizeAnswer(answer.answer_text);
  }

  if (answer.numeric_answer !== null) {
    return bet.numeric_answer === answer.numeric_answer;
  }

  return normalizeAnswer(bet.answer_text) === normalizeAnswer(answer.answer_text);
}

async function loadNameMaps() {
  if (!supabase) return { playerNames: new Map<string, string>(), teamNames: new Map<string, string>() };

  const [{ data: players, error: playersError }, { data: teams, error: teamsError }] = await Promise.all([
    supabase.from("players").select("id, full_name"),
    supabase.from("teams").select("id, name, code, flag_emoji")
  ]);

  if (playersError) throw playersError;
  if (teamsError) throw teamsError;

  return {
    playerNames: new Map(((players ?? []) as NameRow[]).map((player) => [player.id, player.full_name ?? ""])),
    teamNames: new Map(((teams ?? []) as NameRow[]).map((team) => [team.id, `${team.flag_emoji ?? ""} ${team.name ?? ""} · ${team.code ?? ""}`.trim()]))
  };
}

export async function listColombiaOfficialAnswers(): Promise<Record<string, ColombiaOfficialAnswerInput & { points: number; label: string }>> {
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("colombia_answers")
    .select("question_key, answer_text, selected_team_id, selected_player_id, numeric_answer, points, is_closed");

  if (error) throw error;

  const { playerNames, teamNames } = await loadNameMaps();

  return ((data ?? []) as ColombiaAnswerRow[]).reduce<Record<string, ColombiaOfficialAnswerInput & { points: number; label: string }>>((acc, row) => {
    acc[row.question_key] = {
      questionKey: row.question_key,
      answerText: row.answer_text ?? undefined,
      selectedTeamId: row.selected_team_id ?? undefined,
      selectedPlayerId: row.selected_player_id ?? undefined,
      numericAnswer: row.numeric_answer ?? undefined,
      isClosed: row.is_closed ?? false,
      points: row.points,
      label: buildValue(row, playerNames, teamNames)?.label ?? ""
    };
    return acc;
  }, {});
}

export async function saveColombiaOfficialAnswer(input: ColombiaOfficialAnswerInput): Promise<void> {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const existingQuestion = colombiaQuestions.find((question) => question.key === input.questionKey);
  if (!existingQuestion) throw new Error("Pregunta de Colombia invalida.");

  const { error } = await supabase.from("colombia_answers").upsert(
    {
      question_key: input.questionKey,
      answer_text: input.answerText || null,
      selected_team_id: input.selectedTeamId || null,
      selected_player_id: input.selectedPlayerId || null,
      numeric_answer: input.numericAnswer ?? null,
      is_closed: input.isClosed
    },
    { onConflict: "question_key" }
  );

  if (error) throw error;
}

export async function listColombiaResultDetails(participantId?: string): Promise<ColombiaResultDetail[]> {
  if (!supabase || !participantId) return [];

  const [{ data: answers, error: answersError }, { data: bets, error: betsError }, { playerNames, teamNames }] = await Promise.all([
    supabase.from("colombia_answers").select("question_key, answer_text, selected_team_id, selected_player_id, numeric_answer, points, is_closed"),
    supabase
      .from("colombia_bets")
      .select("participant_id, question_key, answer_text, selected_team_id, selected_player_id, numeric_answer")
      .eq("participant_id", participantId),
    loadNameMaps()
  ]);

  if (answersError) throw answersError;
  if (betsError) throw betsError;

  const answersByQuestion = new Map(((answers ?? []) as ColombiaAnswerRow[]).map((answer) => [answer.question_key, answer]));
  const betsByQuestion = new Map(((bets ?? []) as ColombiaBetRow[]).map((bet) => [bet.question_key, bet]));

  return colombiaQuestions.map((question) => {
    const answer = answersByQuestion.get(question.key);
    const bet = betsByQuestion.get(question.key);
    const isCorrect = answer ? isCorrectBet(bet, answer) : false;

    return {
      questionKey: question.key,
      label: question.label,
      points: answer?.points ?? 5,
      isClosed: answer?.is_closed ?? false,
      userAnswer: buildValue(bet, playerNames, teamNames),
      officialAnswer: buildValue(answer, playerNames, teamNames),
      earnedPoints: isCorrect ? answer?.points ?? 5 : 0
    };
  });
}
