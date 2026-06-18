import { Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ColombiaQuestion, colombiaQuestions } from "@/features/colombia-polla/colombiaQuestions";
import { ColombiaOfficialAnswerInput, listColombiaOfficialAnswers, saveColombiaOfficialAnswer } from "@/infrastructure/repositories/colombiaResultsRepository";
import { getCurrentUserProfile } from "@/infrastructure/repositories/profilesRepository";
import { searchPlayers, searchTeams } from "@/infrastructure/repositories/searchRepository";

type DraftOfficialAnswer = {
  query: string;
  answerText?: string;
  selectedPlayerId?: string;
  selectedTeamId?: string;
  numericAnswer?: string;
  isClosed: boolean;
};

function OfficialAnswerInput({
  question,
  value,
  onChange
}: {
  question: ColombiaQuestion;
  value: DraftOfficialAnswer;
  onChange: (value: DraftOfficialAnswer) => void;
}) {
  const playerSearch = useQuery({
    queryKey: ["official-player-search", question.key, value.query],
    queryFn: () => searchPlayers(value.query),
    enabled: question.type === "player" && value.query.trim().length >= 2
  });
  const teamSearch = useQuery({
    queryKey: ["official-team-search", question.key, value.query],
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
        onChange={(event) => onChange({ ...value, answerText: event.target.value, query: event.target.value })}
      />
    );
  }

  const options = question.type === "player" ? playerSearch.data ?? [] : teamSearch.data ?? [];

  return (
    <div className="autocomplete-field">
      <input
        placeholder={question.placeholder}
        value={value.query}
        onChange={(event) =>
          onChange({
            ...value,
            query: event.target.value,
            answerText: event.target.value,
            selectedPlayerId: undefined,
            selectedTeamId: undefined
          })
        }
      />
      {options.length > 0 ? (
        <div className="autocomplete-list">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
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

export function AdminColombiaResultsPage() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, DraftOfficialAnswer>>({});
  const { data: profile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: getCurrentUserProfile
  });
  const { data: officialAnswers = {} } = useQuery({
    queryKey: ["colombia-official-answers"],
    queryFn: listColombiaOfficialAnswers
  });
  const isAdmin = profile?.role === "superadmin";
  const mutation = useMutation({
    mutationFn: (input: ColombiaOfficialAnswerInput) => saveColombiaOfficialAnswer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colombia-official-answers"] });
      queryClient.invalidateQueries({ queryKey: ["colombia-result-details"] });
      queryClient.invalidateQueries({ queryKey: ["colombia-standings"] });
    }
  });

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      colombiaQuestions.map((question) => {
        const stored = officialAnswers[question.key];
        return [
          question.key,
          {
            query: stored?.label ?? stored?.answerText ?? "",
            answerText: stored?.answerText ?? "",
            selectedPlayerId: stored?.selectedPlayerId,
            selectedTeamId: stored?.selectedTeamId,
            numericAnswer: stored?.numericAnswer !== undefined ? String(stored.numericAnswer) : undefined,
            isClosed: stored?.isClosed ?? false
          } satisfies DraftOfficialAnswer
        ];
      })
    );
    setDrafts(nextDrafts);
  }, [officialAnswers]);

  function updateDraft(questionKey: string, value: DraftOfficialAnswer) {
    setDrafts((current) => ({ ...current, [questionKey]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>, question: ColombiaQuestion) {
    event.preventDefault();
    if (!isAdmin) return;
    const draft = drafts[question.key] ?? { query: "", isClosed: false };
    mutation.mutate({
      questionKey: question.key,
      answerText: draft.answerText || draft.query,
      selectedPlayerId: draft.selectedPlayerId,
      selectedTeamId: draft.selectedTeamId,
      numericAnswer: draft.numericAnswer ? Number(draft.numericAnswer) : undefined,
      isClosed: draft.isClosed
    });
  }

  return (
    <div className="stack">
      <div className="page-title">
        <p className="eyebrow">{isAdmin ? "Solo superadmin edita" : "Resultados oficiales"}</p>
        <h2>Resultados Polla Colombia</h2>
      </div>
      <div className="question-result-list">
        {colombiaQuestions.map((question) => {
          const draft = drafts[question.key] ?? { query: "", isClosed: false };
          return (
            <Card key={question.key}>
              <CardHeader>
                <CardTitle>{question.label}</CardTitle>
                <span className={draft.isClosed ? "status-pill" : "status-pill pending"}>
                  {draft.isClosed ? "Cerrada" : "Pendiente"}
                </span>
              </CardHeader>
              {isAdmin ? (
                <form onSubmit={(event) => handleSubmit(event, question)} className="stack">
                  <label>
                    Resultado real
                    <OfficialAnswerInput question={question} value={draft} onChange={(value) => updateDraft(question.key, value)} />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={draft.isClosed}
                      onChange={(event) => updateDraft(question.key, { ...draft, isClosed: event.target.checked })}
                    />
                    Cerrar esta pregunta y sumar puntos
                  </label>
                  <div className="card-actions">
                    <Button disabled={mutation.isPending}>
                      <Save size={16} />
                      {mutation.isPending ? "Guardando..." : "Guardar resultado"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="readonly-field">
                  <span>Resultado real</span>
                  <strong>{draft.query || "Pendiente"}</strong>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {isAdmin && mutation.isError ? <p className="form-error">No pude guardar el resultado de Colombia.</p> : null}
      {isAdmin && mutation.isSuccess ? <p className="form-success">Resultado de Colombia guardado.</p> : null}
    </div>
  );
}
