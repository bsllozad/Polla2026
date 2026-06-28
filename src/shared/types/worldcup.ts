export type TeamId = string;
export type MatchId = string;
export type ParticipantId = string;

export type PlayerPosition = "goalkeeper" | "defender" | "holding_midfielder" | "attacking_midfielder" | "forward";

export type Team = {
  id: TeamId;
  name: string;
  code: string;
  flagEmoji: string;
  groupName?: string;
};

export type Player = {
  id: string;
  teamId: TeamId;
  fullName: string;
  position: PlayerPosition;
  shirtNumber?: number;
  photoUrl?: string;
};

export type MatchStage = "group" | "round_32" | "round_16" | "quarter_final" | "semi_final" | "third_place" | "final";
export type MatchStatus = "scheduled" | "live" | "finished" | "invalid";

export type Match = {
  id: MatchId;
  fifaMatchNo?: number;
  stage: MatchStage;
  kickoffAt: string;
  homeTeam: Team;
  awayTeam: Team;
  homeSlot?: string;
  awaySlot?: string;
  venue?: string;
  status: MatchStatus;
};

export type Prediction = {
  participantId: ParticipantId;
  matchId: MatchId;
  homeScore: number;
  awayScore: number;
  homeScorerId?: string;
  awayScorerId?: string;
  createdAt: string;
};

export type MatchResult = {
  matchId: MatchId;
  homeScore: number;
  awayScore: number;
  scorerIds: string[];
  status: "finished" | "invalid";
};

export type Participant = {
  id: ParticipantId;
  displayName: string;
  userId?: string;
  avatarUrl?: string;
  isActive: boolean;
};
