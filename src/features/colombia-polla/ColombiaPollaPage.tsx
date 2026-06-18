import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { isColombiaPollaClosed } from "@/features/colombia-polla/colombiaPollaConfig";
import { ColombiaQuestion, colombiaQuestions } from "@/features/colombia-polla/colombiaQuestions";
import { useActiveParticipantStore } from "@/features/family-users/activeParticipantStore";
import { listColombiaBetsByParticipant, saveColombiaBets } from "@/infrastructure/repositories/colombiaBetsRepository";
import { searchPlayers, searchTeams } from "@/infrastructure/repositories/searchRepository";

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
  disabled,
  onChange
}: {
  question: ColombiaQuestion;
  value: DraftAnswer;
  disabled?: boolean;
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
        disabled={disabled}
        onChange={(event) => onChange({ ...value, numericAnswer: event.target.value, answerText: event.target.value })}
      />
    );
  }

  if (question.type === "text") {
    return (
      <input
        placeholder={question.placeholder}
        value={value.answerText ?? ""}
        disabled={disabled}
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
        disabled={disabled}
        onChange={(event) => onChange({ query: event.target.value, answerText: event.target.value })}
      />
      {options.length > 0 ? (
        <div className="autocomplete-list">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
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
        colombiaQuestions.map((question) => {
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
      colombiaQuestions.map((question) => {
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
    if (!activeParticipant || isColombiaPollaClosed) return;
    mutation.mutate();
  }

  return (
    <div className="stack">
      <div className="page-title">
        <p className="eyebrow">Premio sorpresa</p>
        <h2>Polla Colombia</h2>
      </div>
      {isColombiaPollaClosed ? <p className="form-success">La polla Colombia ya esta cerrada. Tus respuestas quedan en solo lectura.</p> : null}
      {!activeParticipant ? <p className="form-error">Selecciona un participante antes de guardar respuestas.</p> : null}
      <Card>
        <CardHeader>
          <CardTitle>Preguntas de 5 puntos</CardTitle>
          <span className="muted">Cada acierto suma 5 puntos en tabla separada.</span>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <div className="question-list">
            {colombiaQuestions.map((question) => (
              <label key={question.key}>
                {question.label}
                <ColombiaQuestionInput
                  question={question}
                  value={answers[question.key] ?? { query: "" }}
                  disabled={isColombiaPollaClosed}
                  onChange={(value) => updateAnswer(question.key, value)}
                />
              </label>
            ))}
          </div>
          {mutation.isError ? <p className="form-error">No pude guardar las respuestas.</p> : null}
          {mutation.isSuccess ? <p className="form-success">Respuestas guardadas.</p> : null}
          <div className="card-actions">
            <Button disabled={!activeParticipant || isColombiaPollaClosed || mutation.isPending}>{isColombiaPollaClosed ? "Polla cerrada" : mutation.isPending ? "Guardando..." : "Guardar respuestas"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
