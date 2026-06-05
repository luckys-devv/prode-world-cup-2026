export enum GroupRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

/**
 * Cada grupo tiene su propia configuración de puntaje.
 * El que cree el grupo decide:
 *   1. Qué opciones de puntaje se activan (enabled: true/false)
 *   2. Cuántos puntos vale cada opción (points: número)
 *
 * Ejemplo: Un grupo podría tener:
 *   - Ganador/empate: activado, 1 punto
 *   - Resultado exacto: activado, 3 puntos
 *   - Líder de grupo: desactivado
 *   - Campeón: activado, 5 puntos
 */
export interface ScoringConfig {
  /** Puntos por acertar quién gana o si empata (HOME_TEAM/AWAY_TEAM/DRAW) */
  winnerPrediction: {
    enabled: boolean;
    points: number; // Ej: 1
  };
  /** Puntos por acertar el resultado exacto (ej: 2-1) */
  exactScore: {
    enabled: boolean;
    points: number; // Ej: 3
  };
  /** Puntos por acertar qué equipo termina 1° en su grupo */
  groupLeader: {
    enabled: boolean;
    points: number; // Ej: 3
  };
  /** Puntos por acertar el campeón del mundial */
  champion: {
    enabled: boolean;
    points: number; // Ej: 5
  };
}

// ─── spicy ENTIDADES ───

export interface Group {
  id: number;
  name: string;
  inviteCode: string;
  prizeDescription: string | null;
  maxMembers: number;
  memberCount: number;
  scoringConfig: ScoringConfig;
  creatorId: number;
  createdAt: string;
}

export interface GroupMember {
  id: number;
  userId: number;
  displayName: string;
  email: string;
  role: GroupRole;
  joinedAt: string;
}

export interface Invitation {
  id: number;
  groupId: number;
  groupName: string;
  senderName: string;
  email: string;
  status: InvitationStatus;
  createdAt: string;
}

// ─── REQUESTS ───

/** Datos para crear un grupo nuevo  */
export interface CreateGroupRequest {
  name: string;
  prizeDescription?: string;
  scoringConfig: ScoringConfig;
}

export interface UpdateGroupRequest {
  name?: string;
  prizeDescription?: string;
}

export interface InviteByEmailRequest {
  groupId: number;
  email: string;
}