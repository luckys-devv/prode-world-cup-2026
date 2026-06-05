// Tipos para partidos y equipos del Mundial.
// Los valores de los enums coinciden EXACTAMENTE con lo que devuelve
// la API de football-data.org, así no necesitamos transformar datos.

// ─── ENUMS ───

/** Etapas del torneo. esto va de la mano de los valores de football-data.org */
export enum MatchStage {
  GROUP_STAGE = 'GROUP_STAGE',
  LAST_32 = 'LAST_32',
  LAST_16 = 'LAST_16',
  QUARTER_FINALS = 'QUARTER_FINALS',
  SEMI_FINALS = 'SEMI_FINALS',
  THIRD_PLACE = 'THIRD_PLACE',
  FINAL = 'FINAL',
}

/** Estado de un partido */
export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',   // Programado (aún no empezó)
  TIMED = 'TIMED',           // Con hora confirmada
  IN_PLAY = 'IN_PLAY',       // En juego (primer o segundo tiempo)
  PAUSED = 'PAUSED',         // Entretiempo
  FINISHED = 'FINISHED',     // Finalizado
  POSTPONED = 'POSTPONED',   // Pospuesto
  CANCELLED = 'CANCELLED',   // Cancelado
}

/** Posibles resultados  de un partido.
 *  Estos son los valores que un usuario puede elegir como "predicción",
 *  y también los que devuelve la API como resultado real.
 */
export enum MatchResult {
  HOME_TEAM = 'HOME_TEAM',   // Gana el local
  AWAY_TEAM = 'AWAY_TEAM',   // Gana el visitante
  DRAW = 'DRAW',             // Empate (solo fase de grupos)
}

// ─── ENTIDADES DEMONIACAS ───

/** Equipo participante del Mundial */
export interface Team {
  id: number;
  externalId: number;    // ID en football-data.org
  name: string;          // Nombre completo (ej: "Argentina")
  shortName: string;     // Nombre corto (ej: "Argentina")
  tla: string;           // Código 3 letras (ej: "ARG")
  crestUrl: string | null; // URL del escudo del equipo
}

/** Partido del Mundial */
export interface Match {
  id: number;
  externalId: number;
  homeTeam: Team;        // Equipo local
  awayTeam: Team;        // Equipo visitante
  matchDate: string;     // Fecha y hora UTC en ISO 8601
  stage: MatchStage;     // Etapa del torneo
  groupName: string | null; // "GROUP_A", "GROUP_B"... (null en eliminatorias)
  matchday: number | null;  // Fecha 1, 2, 3 (en fase de grupos)
  status: MatchStatus;
  result: MatchResult | null;  // null si aún no terminó
  homeScore: number | null;
  awayScore: number | null;
}

/** Match resumido para listas (sin objetos Team completos) */
export interface MatchSummary {
  id: number;
  homeTeamName: string;
  homeTeamTla: string;
  homeTeamCrest: string | null;
  awayTeamName: string;
  awayTeamTla: string;
  awayTeamCrest: string | null;
  matchDate: string;
  stage: MatchStage;
  groupName: string | null;
  status: MatchStatus;
  result: MatchResult | null;
  homeScore: number | null;
  awayScore: number | null;
}