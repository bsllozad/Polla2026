import { RefreshCw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { applyRound32Proposal, updateBracketMatchTeams } from "@/infrastructure/repositories/bracketRepository";
import { listMatches } from "@/infrastructure/repositories/matchesRepository";
import { listTeams } from "@/infrastructure/repositories/teamsRepository";
import { Match, MatchStage, Team } from "@/shared/types/worldcup";

const stageLabels: Record<MatchStage, string> = {
  group: "Grupos",
  round_32: "16avos",
  round_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinal",
  third_place: "Tercer puesto",
  final: "Final"
};

type MatchDraft = {
  homeTeamId: string;
  awayTeamId: string;
};

function isResolvedTeam(team: Team) {
  return team.id !== "pending" && !team.id.startsWith("W") && !team.id.startsWith("L") && !/^\d/.test(team.id);
}

function currentTeamValue(team: Team) {
  return isResolvedTeam(team) ? team.id : "";
}

function TeamSelect({
  value,
  teams,
  placeholder,
  onChange
}: {
  value: string;
  teams: Team[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.flagEmoji} {team.code} · {team.name}
        </option>
      ))}
    </select>
  );
}

export function AdminBracketPage() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, MatchDraft>>({});
  const { data: matches = [], isLoading: isLoadingMatches, error: matchesError } = useQuery({
    queryKey: ["admin-bracket-matches"],
    queryFn: () => listMatches({ limit: 104, showAll: true })
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: listTeams
  });

  const knockoutMatches = useMemo(
    () => matches.filter((match) => match.stage !== "group").sort((left, right) => (left.fifaMatchNo ?? 0) - (right.fifaMatchNo ?? 0)),
    [matches]
  );

  const saveMutation = useMutation({
    mutationFn: (match: Match) => {
      const draft = drafts[match.id];
      return updateBracketMatchTeams({
        matchId: match.id,
        homeTeamId: draft?.homeTeamId ?? currentTeamValue(match.homeTeam),
        awayTeamId: draft?.awayTeamId ?? currentTeamValue(match.awayTeam)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bracket-matches"] });
      queryClient.invalidateQueries({ queryKey: ["tournament-bracket"] });
      queryClient.invalidateQueries({ queryKey: ["prediction-matches"] });
    }
  });

  const proposalMutation = useMutation({
    mutationFn: applyRound32Proposal,
    onSuccess: () => {
      setDrafts({});
      queryClient.invalidateQueries({ queryKey: ["admin-bracket-matches"] });
      queryClient.invalidateQueries({ queryKey: ["tournament-bracket"] });
      queryClient.invalidateQueries({ queryKey: ["prediction-matches"] });
    }
  });

  function updateDraft(match: Match, key: keyof MatchDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [match.id]: {
        homeTeamId: current[match.id]?.homeTeamId ?? currentTeamValue(match.homeTeam),
        awayTeamId: current[match.id]?.awayTeamId ?? currentTeamValue(match.awayTeam),
        [key]: value
      }
    }));
  }

  return (
    <div className="stack">
      <div className="page-title page-title-row">
        <div>
          <p className="eyebrow">Solo superadmin</p>
          <h2>Administrar cruces</h2>
        </div>
        <Button type="button" variant="secondary" onClick={() => proposalMutation.mutate()} disabled={proposalMutation.isPending}>
          <RefreshCw size={16} />
          {proposalMutation.isPending ? "Calculando..." : "Calcular 16avos"}
        </Button>
      </div>
      {isLoadingMatches ? <p className="empty-state">Cargando cruces...</p> : null}
      {matchesError ? <p className="form-error">No pude cargar los partidos.</p> : null}
      {proposalMutation.isError ? <p className="form-error">No pude calcular la propuesta. Revisa que los grupos tengan resultados.</p> : null}
      {proposalMutation.isSuccess ? <p className="form-success">Propuesta aplicada. Revisa y corrige lo que haga falta.</p> : null}

      <div className="admin-bracket-list">
        {knockoutMatches.map((match) => {
          const draft = drafts[match.id];
          const homeValue = draft?.homeTeamId ?? currentTeamValue(match.homeTeam);
          const awayValue = draft?.awayTeamId ?? currentTeamValue(match.awayTeam);
          const isSavingThisMatch = saveMutation.isPending && saveMutation.variables?.id === match.id;
          const didSaveThisMatch = saveMutation.isSuccess && saveMutation.variables?.id === match.id;
          const didFailThisMatch = saveMutation.isError && saveMutation.variables?.id === match.id;

          return (
            <Card key={match.id}>
              <CardHeader>
                <CardTitle>#{match.fifaMatchNo} · {stageLabels[match.stage]}</CardTitle>
                <span className="muted">{new Date(match.kickoffAt).toLocaleDateString()} · {match.venue}</span>
              </CardHeader>
              <div className="bracket-admin-grid">
                <label>
                  Local · slot {match.homeSlot ?? "-"}
                  <TeamSelect
                    value={homeValue}
                    teams={teams}
                    placeholder={match.homeSlot ?? "Por definir"}
                    onChange={(value) => updateDraft(match, "homeTeamId", value)}
                  />
                </label>
                <label>
                  Visitante · slot {match.awaySlot ?? "-"}
                  <TeamSelect
                    value={awayValue}
                    teams={teams}
                    placeholder={match.awaySlot ?? "Por definir"}
                    onChange={(value) => updateDraft(match, "awayTeamId", value)}
                  />
                </label>
              </div>
              <div className="card-actions">
                <Button type="button" onClick={() => saveMutation.mutate(match)} disabled={isSavingThisMatch}>
                  <Save size={16} />
                  {isSavingThisMatch ? "Guardando..." : "Guardar cruce"}
                </Button>
              </div>
              {didFailThisMatch ? <p className="form-error">No pude guardar este cruce. Revisa permisos de superadmin.</p> : null}
              {didSaveThisMatch ? <p className="form-success">Cruce guardado.</p> : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
