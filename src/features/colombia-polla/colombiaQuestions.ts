export type ColombiaQuestionType = "player" | "team" | "number" | "text";

export type ColombiaQuestion = {
  key: string;
  label: string;
  type: ColombiaQuestionType;
  placeholder: string;
};

export const colombiaQuestions: ColombiaQuestion[] = [
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
