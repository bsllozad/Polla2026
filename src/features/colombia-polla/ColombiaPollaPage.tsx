import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useActiveParticipantStore } from "@/features/family-users/activeParticipantStore";
import { listColombiaBetsByParticipant, saveColombiaBets } from "@/infrastructure/repositories/colombiaBetsRepository";
import { searchPlayers, searchTeams } from "@/infrastructure/repositories/searchRepository";

type QuestionType = "player" | "team" | "number" | "text";

type Question = {
  key: string;
  label: string;
  type: QuestionType;
  placeholder: string;
};

const questions: Question[] = [
  { key: "first_colombia_goal", label: "Primer jugador de Colombia en marcar gol", type: "player", placeholder: "Buscar jugador" },
  { key: "top_colombia_scorer", label: "Goleador de Colombia en el Mundial", type: "player", placeholder: "Buscar jugador" },
  { key: "messi_goals", label: "Cuantos goles mete Messi", type: "number", placeholder: "Numero de goles" },
  { key: "ronaldo_goals", label: "Cuantos goles mete Cristiano Ronaldo", type: "number", placeholder: "Numero de goles" },
  { key: "colombia_finish", label: "Hasta donde llega Colombia", type: "text", placeholder: "Ej: octavos, cuartos, campeon" },
  { key: "world_cup_top_scorer", label: "Goleador del Mundial", type: "player", placeholder: "Buscar jugador" },
  { key: "world_cup_assist_leader", label: "Lider de asistencias", type: "player", placeholder: "Buscar jugador" },
  { key: "first_eliminated", label: "Primer eliminado", type: "team", placeholder: "Buscar seleccion" },
  { key: "champion", label: "Campeon del Mundial", type: "team", placeholder: "Buscar seleccion" }
];

type DraftAnswer = {
  query: string;
  answerText?: string;
  selectedPlayerId?: string;
  selectedTeamId?: string;
  numericAnswer?: string;
};

function ColombiaQuestionInput({
  question,
  value,
  onChange
}: {
  question: Question;
  value: DraftAnswer;
  onChange: (value: DraftAnswer) => void;
}) {
  const playerSearch = useQuery({
    queryKey: ["player-search", question.key, value.query],
    queryFn: () => searchPlayers(value.query),
    enabled: question.type === "player" && value.query.trim().length >= 2
  });
  const teamSearch = useQuery({
    queryKey: ["team-search", question.key, value.query],
    queryFn: () => searchTeams(value.query),
    enabled: question.type === "team" && value.query.trim().length >= 2
  });

  if (question.type === "number") {
    return (
      <input
        type="number"
        min="0"
        placeholder={question.placeholder}
        value={value.numericAnswer ?? ""}
        onChange={(event) => onChange({ ...value, numericAnswer: event.target.value, answerText: event.target.value })}
      />
    );
  }

  if (question.type === "text") {
    return (
      <input
        placeholder={question.placeholder}
        value={value.answerText ?? ""}
        onChange={(event) => onChange({ ...value, answerText: event.target.value })}
      />
    );
  }

  const options = question.type === "player" ? playerSearch.data ?? [] : teamSearch.data ?? [];

  return (
    <div className="autocomplete-field">
      <input
        placeholder={question.placeholder}
        value={value.query}
        onChange={(event) => onChange({ query: event.target.value, answerText: event.target.value })}
      />
      {options.length > 0 ? (
        <div className="autocomplete-list">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange({
                  query: option.label,
                  answerText: option.label,
                  selectedPlayerId: question.type === "player" ? option.id : undefined,
                  selectedTeamId: question.type === "team" ? option.id : undefined
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ColombiaPollaPage() {
  const activeParticipant = useActiveParticipantStore((state) => state.activeParticipant);
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({});
  const { data: storedAnswers = {} } = useQuery({
    queryKey: ["colombia-bets", activeParticipant?.id],
    queryFn: () => listColombiaBetsByParticipant(activeParticipant?.id),
    enabled: Boolean(activeParticipant?.id)
  });
  const mutation = useMutation({
    mutationFn: () =>
      saveColombiaBets(
        questions.map((question) => {
          const answer = answers[question.key] ?? { query: "" };
          return {
            participantId: activeParticipant?.id ?? "",
            questionKey: question.key,
            answerText: answer.answerText || answer.query,
            selectedPlayerId: answer.selectedPlayerId,
            selectedTeamId: answer.selectedTeamId,
            numericAnswer: answer.numericAnswer ? Number(answer.numericAnswer) : undefined
          };
        })
      )
  });

  useEffect(() => {
    const nextAnswers = Object.fromEntries(
      questions.map((question) => {
        const stored = storedAnswers[question.key];
        return [
          question.key,
          {
            query: stored?.answerText ?? "",
            answerText: stored?.answerText ?? "",
            selectedPlayerId: stored?.selectedPlayerId,
            selectedTeamId: stored?.selectedTeamId,
            numericAnswer: stored?.numericAnswer !== undefined ? String(stored.numericAnswer) : undefined
          } satisfies DraftAnswer
        ];
      })
    );
    setAnswers(nextAnswers);
  }, [storedAnswers, activeParticipant?.id]);

  function updateAnswer(questionKey: string, value: DraftAnswer) {
    setAnswers((current) => ({ ...current, [questionKey]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeParticipant) return;
    mutation.mutate();
  }

  return (
    <div className="stack">
      <div className="page-title">
        <p className="eyebrow">Premio sorpresa</p>
        <h2>Polla Colombia</h2>
      </div>
      {!activeParticipant ? <p className="form-error">Selecciona un participante antes de guardar respuestas.</p> : null}
      <Card>
        <CardHeader>
          <CardTitle>Preguntas de 5 puntos</CardTitle>
          <span className="muted">Cada acierto suma 5 puntos en tabla separada.</span>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <div className="question-list">
            {questions.map((question) => (
              <label key={question.key}>
                {question.label}
                <ColombiaQuestionInput
                  question={question}
                  value={answers[question.key] ?? { query: "" }}
                  onChange={(value) => updateAnswer(question.key, value)}
                />
              </label>
            ))}
          </div>
          {mutation.isError ? <p className="form-error">No pude guardar las respuestas.</p> : null}
          {mutation.isSuccess ? <p className="form-success">Respuestas guardadas.</p> : null}
          <div className="card-actions">
            <Button disabled={!activeParticipant || mutation.isPending}>{mutation.isPending ? "Guardando..." : "Guardar respuestas"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
