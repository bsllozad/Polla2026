import { Match, Team } from "@/shared/types/worldcup";

const leftRound32 = [74, 77, 73, 75, 83, 84, 81, 82];
const leftRound16 = [89, 90, 93, 94];
const leftQuarters = [97, 98];
const leftSemi = [101];
const rightSemi = [102];
const rightQuarters = [99, 100];
const rightRound16 = [91, 92, 95, 96];
const rightRound32 = [76, 78, 79, 80, 86, 88, 85, 87];
const centerMatches = [104, 103];

const kickoffFormatter = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Denver"
});

function isPendingTeam(team: Team) {
  return team.id === "pending" || /^[WL]\d+$/.test(team.id) || /^[12][A-L]$/.test(team.id) || /^3[A-L]+$/.test(team.id);
}

function matchByNo(matches: Match[], matchNo: number) {
  return matches.find((match) => match.fifaMatchNo === matchNo);
}

function displayTeam(team: Team) {
  if (isPendingTeam(team)) return team.code || team.name;
  return team.code || team.name;
}

function formatKickoff(kickoffAt: string) {
  return kickoffFormatter.format(new Date(kickoffAt)).replace(",", "");
}

function BracketTeam({ team, side }: { team: Team; side: "left" | "right" }) {
  const pending = isPendingTeam(team);

  return (
    <div className={`knockout-team ${pending ? "knockout-team-pending" : ""}`}>
      {side === "right" ? <span className="knockout-team-name">{displayTeam(team)}</span> : null}
      <span className="knockout-team-flag">{pending ? "" : team.flagEmoji}</span>
      {side === "left" ? <span className="knockout-team-name">{displayTeam(team)}</span> : null}
    </div>
  );
}

function BracketMatch({ match, side }: { match?: Match; side: "left" | "right" | "center" }) {
  if (!match) {
    return <div className={`knockout-match knockout-match-empty knockout-match-${side}`} />;
  }

  const teamSide = side === "right" ? "right" : "left";

  return (
    <article className={`knockout-match knockout-match-${side}`}>
      <div className="knockout-match-meta">
        <span>{formatKickoff(match.kickoffAt)}</span>
        <a> M{match.fifaMatchNo}</a>
      </div>
      <BracketTeam team={match.homeTeam} side={teamSide} />
      <BracketTeam team={match.awayTeam} side={teamSide} />
    </article>
  );
}

function BracketColumn({
  title,
  matchNumbers,
  matches,
  side,
  className = ""
}: {
  title: string;
  matchNumbers: number[];
  matches: Match[];
  side: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <section className={`knockout-column ${className}`}>
      <h3>{title}</h3>
      <div className="knockout-column-matches">
        {matchNumbers.map((matchNo) => (
          <BracketMatch key={matchNo} match={matchByNo(matches, matchNo)} side={side} />
        ))}
      </div>
    </section>
  );
}

export function BracketBoard({ matches }: { matches: Match[] }) {
  const knockoutMatches = matches.filter((match) => match.stage !== "group");

  if (knockoutMatches.length === 0) {
    return <p className="empty-state">Los cruces apareceran cuando se cargue el fixture eliminatorio.</p>;
  }

  return (
    <div className="knockout-scroll" aria-label="Knockout bracket del Mundial">
      <div className="knockout-board">
        <BracketColumn title="16avos" matchNumbers={leftRound32} matches={knockoutMatches} side="left" className="knockout-col-r32" />
        <BracketColumn title="Octavos" matchNumbers={leftRound16} matches={knockoutMatches} side="left" className="knockout-col-r16" />
        <BracketColumn title="Cuartos" matchNumbers={leftQuarters} matches={knockoutMatches} side="left" className="knockout-col-qf" />
        <BracketColumn title="Semifinal" matchNumbers={leftSemi} matches={knockoutMatches} side="left" className="knockout-col-sf" />
        <section className="knockout-column knockout-col-center">
          <h3>Final</h3>
          <div className="knockout-column-matches">
            <BracketMatch match={matchByNo(knockoutMatches, centerMatches[0])} side="center" />
            <div className="knockout-third-title">Tercer puesto</div>
            <BracketMatch match={matchByNo(knockoutMatches, centerMatches[1])} side="center" />
          </div>
        </section>
        <BracketColumn title="Semifinal" matchNumbers={rightSemi} matches={knockoutMatches} side="right" className="knockout-col-sf" />
        <BracketColumn title="Cuartos" matchNumbers={rightQuarters} matches={knockoutMatches} side="right" className="knockout-col-qf" />
        <BracketColumn title="Octavos" matchNumbers={rightRound16} matches={knockoutMatches} side="right" className="knockout-col-r16" />
        <BracketColumn title="16avos" matchNumbers={rightRound32} matches={knockoutMatches} side="right" className="knockout-col-r32" />
      </div>
      <p className="bracket-timezone">Todos los horarios estan en Mountain Time</p>
    </div>
  );
}
