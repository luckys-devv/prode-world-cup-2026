import { db } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { CreatePredictionInput } from './predictions.validation.js';
import { ScoringConfig } from '@prode/shared';

/**
 * Crea o actualiza la predicción de un usuario para un partido dentro de un grupo.
 */
export async function createOrUpdatePrediction(userId: number, input: CreatePredictionInput) {
  const { matchId, groupId, prediction, predictedHomeScore, predictedAwayScore } = input;

  // 1. Validar que el usuario sea miembro del grupo
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) {
    const error = new Error('No tienes permiso para hacer predicciones en este grupo (no eres miembro).') as any;
    error.statusCode = 403;
    throw error;
  }

  // 2. Obtener el partido y validar que no haya comenzado
  const match = await db.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    const error = new Error('El partido especificado no existe.') as any;
    error.statusCode = 404;
    throw error;
  }

  // Regla 1: Bloqueo por horario
  const now = new Date();
  if (now >= new Date(match.matchDate)) {
    const error = new Error('No puedes enviar o modificar predicciones una vez que el partido ha comenzado.') as any;
    error.statusCode = 403;
    throw error;
  }

  // 3. Registrar o actualizar predicción (upsert)
  return await db.matchPrediction.upsert({
    where: {
      userId_matchId_groupId: { userId, matchId, groupId },
    },
    update: {
      prediction,
      predictedHomeScore: predictedHomeScore !== undefined ? predictedHomeScore : null,
      predictedAwayScore: predictedAwayScore !== undefined ? predictedAwayScore : null,
      winnerPoints: null, // Reseteamos los puntos calculados por precaución
      exactScorePoints: null,
    },
    create: {
      userId,
      matchId,
      groupId,
      prediction,
      predictedHomeScore: predictedHomeScore !== undefined ? predictedHomeScore : null,
      predictedAwayScore: predictedAwayScore !== undefined ? predictedAwayScore : null,
    },
  });
}

/**
 * Obtener las predicciones del usuario actual dentro de un grupo.
 */
export async function getUserPredictionsInGroup(userId: number, groupId: number) {
  return await db.matchPrediction.findMany({
    where: { userId, groupId },
    include: {
      match: true,
    },
  });
}

/**
 * Obtener los pronósticos de todos los miembros para un partido en un grupo,
 * aplicando la configuración de privacidad del grupo.
 */
export async function getMatchPredictionsInGroup(groupId: number, matchId: number, currentUserId: number) {
  // 1. Validar que el solicitante sea miembro
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: currentUserId } },
    include: {
      group: true,
    },
  });

  if (!membership) {
    const error = new Error('No tienes permiso para ver esta información (no eres miembro).') as any;
    error.statusCode = 403;
    throw error;
  }

  // 2. Obtener el partido para verificar su horario de inicio
  const match = await db.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    const error = new Error('El partido solicitado no existe.') as any;
    error.statusCode = 404;
    throw error;
  }

  // 3. Obtener predicciones de todos los miembros
  const allPredictions = await db.matchPrediction.findMany({
    where: { groupId, matchId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  // 4. Evaluar la configuración de privacidad del grupo
  const scoringConfig = membership.group.scoringConfig as unknown as ScoringConfig;
  const showBeforeStart = scoringConfig.showPredictionsBeforeStart ?? false;

  const now = new Date();
  const matchStarted = now >= new Date(match.matchDate);

  // Si el partido no empezó y el admin configuró ocultarlos
  if (!matchStarted && !showBeforeStart) {
    return allPredictions.map((pred) => {
      const isSelf = pred.userId === currentUserId;
      return {
        id: pred.id,
        userId: pred.userId,
        matchId: pred.matchId,
        groupId: pred.groupId,
        user: pred.user,
        // Ocultamos la predicción si es de otro miembro
        prediction: isSelf ? pred.prediction : 'HIDDEN',
        predictedHomeScore: isSelf ? pred.predictedHomeScore : null,
        predictedAwayScore: isSelf ? pred.predictedAwayScore : null,
        winnerPoints: pred.winnerPoints,
        exactScorePoints: pred.exactScorePoints,
        createdAt: pred.createdAt,
        updatedAt: pred.updatedAt,
      };
    });
  }

  // Si ya empezó o está permitido verlos, devolvemos los datos reales completos
  return allPredictions;
}

/**
 * Crea o actualiza la predicción del campeón del usuario en un grupo.
 */
export async function createOrUpdateChampionPrediction(userId: number, groupId: number, teamId: number) {
  // 1. Validar que el usuario sea miembro del grupo
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) {
    const error = new Error('No tienes permiso para hacer predicciones en este grupo (no eres miembro).') as any;
    error.statusCode = 403;
    throw error;
  }

  // 2. Validar que el mundial no haya comenzado (bloqueo por horario del 1° partido)
  const earliestMatch = await db.match.findFirst({
    orderBy: { matchDate: 'asc' },
  });

  if (earliestMatch && new Date() >= new Date(earliestMatch.matchDate)) {
    const error = new Error('No puedes elegir o cambiar el campeón una vez que el mundial ha comenzado.') as any;
    error.statusCode = 403;
    throw error;
  }

  // 3. Registrar o actualizar la predicción
  return await db.championPrediction.upsert({
    where: {
      userId_groupId: { userId, groupId },
    },
    update: {
      teamId,
    },
    create: {
      userId,
      groupId,
      teamId,
    },
  });
}

/**
 * Obtener la predicción del campeón del usuario actual en un grupo.
 */
export async function getChampionPrediction(userId: number, groupId: number) {
  return await db.championPrediction.findUnique({
    where: {
      userId_groupId: { userId, groupId },
    },
    include: {
      team: true,
    },
  });
}

/**
 * Obtener las predicciones de otro miembro de un grupo aplicando políticas de privacidad.
 */
export async function getMemberPredictionsInGroup(groupId: number, targetUserId: number, currentUserId: number) {
  // 1. Validar que ambos sean miembros del grupo
  const memberships = await db.groupMember.findMany({
    where: {
      groupId,
      userId: { in: [currentUserId, targetUserId] },
    },
    include: {
      group: true,
    },
  });

  const currentUserMembership = memberships.find((m) => m.userId === currentUserId);
  const targetUserMembership = memberships.find((m) => m.userId === targetUserId);

  if (!currentUserMembership) {
    const error = new Error('No tienes permiso para ver esta información (no eres miembro).') as any;
    error.statusCode = 403;
    throw error;
  }

  if (!targetUserMembership) {
    const error = new Error('El usuario especificado no pertenece a este grupo.') as any;
    error.statusCode = 404;
    throw error;
  }

  // 2. Obtener todas las predicciones del miembro objetivo en este grupo
  const targetPredictions = await db.matchPrediction.findMany({
    where: { groupId, userId: targetUserId },
    include: {
      match: {
        include: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    },
    orderBy: {
      match: {
        matchDate: 'asc',
      },
    },
  });

  // 3. Evaluar la privacidad según la configuración del grupo
  const scoringConfig = currentUserMembership.group.scoringConfig as unknown as ScoringConfig;
  const showBeforeStart = scoringConfig.showPredictionsBeforeStart ?? false;
  const now = new Date();

  return targetPredictions.map((pred) => {
    const matchStarted = now >= new Date(pred.match.matchDate);
    const canSee = matchStarted || showBeforeStart || targetUserId === currentUserId;

    return {
      id: pred.id,
      matchId: pred.matchId,
      match: pred.match,
      prediction: canSee ? pred.prediction : 'HIDDEN',
      predictedHomeScore: canSee ? pred.predictedHomeScore : null,
      predictedAwayScore: canSee ? pred.predictedAwayScore : null,
      winnerPoints: pred.winnerPoints,
      exactScorePoints: pred.exactScorePoints,
    };
  });
}