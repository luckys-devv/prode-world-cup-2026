import { MatchResult } from './match';

// ═══════════════════════════════════════════════════
// PREDICCIÓN DE PARTIDO (por cada partido)
// ═══════════════════════════════════════════════════

/** Predicción de un usuario para un partido específico */
export interface MatchPrediction {
  id: number;
  userId: number;
  matchId: number;
  groupId: number;
  /** Predicción de quién gana: HOME_TEAM, AWAY_TEAM, o DRAW */
  prediction: MatchResult;
  /** Predicción del resultado exacto */
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  /** Puntos ganados por acertar ganador (null = pendiente, 0 = falló) */
  winnerPoints: number | null;
  /** Puntos ganados por acertar resultado exacto (null = pendiente, 0 = falló) */
  exactScorePoints: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Esto lo usaremos para crear/actualizar predicción de un partido (request) */
export interface UpsertMatchPredictionRequest {
  matchId: number;
  groupId: number;
  prediction: MatchResult;
  /** Solo lo envio si el grupo tiene habilitado el "resultado exacto" */
  predictedHomeScore?: number;
  predictedAwayScore?: number;
}

// ═══════════════════════════════════════════════════
// PREDICCIÓN DE LÍDER DE GRUPO (NUEVO)
// ═══════════════════════════════════════════════════

export interface GroupLeaderPrediction {
  id: number;
  userId: number;
  groupId: number;           // El grupo del prode (no confundir con grupo del mundial)
  worldCupGroup: string;     // "GROUP_A", "GROUP_B", etc.
  teamId: number;            // Equipo que predice como 1°
  teamName: string;          // Para mostrar en la UI
  pointsEarned: number | null;
  createdAt: string;
}

/** para poner/actualizar predicción de líder de grupo (request) */
export interface UpsertGroupLeaderPredictionRequest {
  groupId: number;           // Grupo del prode
  worldCupGroup: string;     // "GROUP_A"
  teamId: number;            // Equipo que elige como 1°
}

// ═══════════════════════════════════════════════════
// PREDICCIÓN DE CAMPEÓN (NUEVO)
// ═══════════════════════════════════════════════════

export interface ChampionPrediction {
  id: number;
  userId: number;
  groupId: number;
  teamId: number;
  teamName: string;
  pointsEarned: number | null;
  createdAt: string;
}

/** para poner/actualizar predicción de campeón (request) */
export interface UpsertChampionPredictionRequest {
  groupId: number;
  teamId: number;
}

// ═══════════════════════════════════════════════════
// LEADERBOARD (actualizado)
// ═══════════════════════════════════════════════════

/** Fila de la tabla de posiciones — ahora muestra puntos desglosados */
export interface LeaderboardEntry {
  position: number;
  userId: number;
  displayName: string;
  /** Desglose de puntos por categoría */
  winnerPoints: number;      // Puntos por acertar ganador/empate
  exactScorePoints: number;  // Puntos por resultado exacto
  groupLeaderPoints: number; // Puntos por líder de grupo
  championPoints: number;    // Puntos por campeón
  totalPoints: number;       // Suma de todo
}

/** Para que todos puedan ver lo que puso cada amigote jeje */
export interface MemberMatchPrediction {
  matchId: number;
  homeTeamName: string;
  awayTeamName: string;
  matchDate: string;
  prediction: MatchResult;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  winnerPoints: number | null;
  exactScorePoints: number | null;
  actualResult: MatchResult | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
}