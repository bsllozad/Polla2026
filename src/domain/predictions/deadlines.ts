import { Match } from "@/shared/types/worldcup";

export function firstKickoffOfLocalDay(matches: Match[], targetDate: Date): Date | null {
  const targetKey = targetDate.toLocaleDateString();
  const sameDayMatches = matches
    .map((match) => new Date(match.kickoffAt))
    .filter((date) => date.toLocaleDateString() === targetKey)
    .sort((a, b) => a.getTime() - b.getTime());

  return sameDayMatches[0] ?? null;
}

export function canEditPrediction(matches: Match[], match: Match, now = new Date()): boolean {
  const firstKickoff = firstKickoffOfLocalDay(matches, new Date(match.kickoffAt));
  return Boolean(firstKickoff && now.getTime() < firstKickoff.getTime());
}
