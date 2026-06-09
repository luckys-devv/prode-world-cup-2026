import { db } from '../../config/database.js';
import { generateInviteCode } from '../../utils/generateInviteCode.js';
import { CreateGroupInput } from './groups.validation.js';

/**
 * Crea un nuevo grupo de prode y asocia al creador como miembro administrador.
 */
export async function createGroup(userId: number, input: CreateGroupInput) {
  const { name, prizeDescription, scoringConfig } = input;

  // Generamos un código de invitación único
  let inviteCode = '';
  let isUnique = false;

  while (!isUnique) {
    inviteCode = generateInviteCode(8);
    const existingGroup = await db.group.findUnique({
      where: { inviteCode },
    });
    if (!existingGroup) {
      isUnique = true;
    }
  }

  // Ejecutamos en una transacción para asegurar consistencia
  return await db.$transaction(async (tx) => {
    // 1. Crear el grupo
    const group = await tx.group.create({
      data: {
        name,
        inviteCode,
        prizeDescription,
        creatorId: userId,
        scoringConfig: scoringConfig as any, // Lo casteamos para guardarlo como Json en Postgres
      },
    });

    // 2. Asociar al creador como miembro admin
    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: 'admin',
      },
    });

    return group;
  });
}

/**
 * Obtiene los grupos en los que participa un usuario.
 */
export async function getUserGroups(userId: number) {
  const memberships = await db.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: {
            select: { members: true },
          },
        },
      },
    },
    orderBy: {
      joinedAt: 'desc',
    },
  });

  return memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    inviteCode: m.group.inviteCode,
    prizeDescription: m.group.prizeDescription,
    maxMembers: m.group.maxMembers,
    memberCount: m.group._count.members,
    role: m.role, // 'admin' | 'member'
    joinedAt: m.joinedAt,
  }));
}

/**
 * Obtiene los detalles de un grupo, validando que el usuario pertenezca al mismo.
 */
export async function getGroupDetail(groupId: number, userId: number) {
  // Verificar membresía primero
  const membership = await db.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId },
    },
  });

  if (!membership) {
    const error = new Error('No tienes permiso para ver este grupo (no eres miembro).') as any;
    error.statusCode = 403;
    throw error;
  }

  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: { members: true },
      },
    },
  });

  if (!group) {
    const error = new Error('El grupo solicitado no existe.') as any;
    error.statusCode = 404;
    throw error;
  }

  return {
    ...group,
    memberCount: group._count.members,
    currentUserRole: membership.role,
  };
}

/**
 * Permite a un usuario unirse a un grupo existente usando su código de invitación.
 */
export async function joinGroupByCode(userId: number, inviteCode: string) {
  const code = inviteCode.trim().toUpperCase();

  const group = await db.group.findUnique({
    where: { inviteCode: code },
    include: {
      _count: {
        select: { members: true },
      },
    },
  });

  if (!group) {
    const error = new Error('Código de invitación inválido o grupo inexistente.') as any;
    error.statusCode = 404;
    throw error;
  }

  // Verificar si ya es miembro
  const existingMembership = await db.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: group.id, userId },
    },
  });

  if (existingMembership) {
    const error = new Error('Ya formas parte de este grupo.') as any;
    error.statusCode = 409;
    throw error;
  }

  // Verificar límite de miembros (límite por defecto 50)
  if (group._count.members >= group.maxMembers) {
    const error = new Error('El grupo ha alcanzado el límite máximo de miembros.') as any;
    error.statusCode = 400;
    throw error;
  }

  // Insertar nueva membresía
  return await db.groupMember.create({
    data: {
      groupId: group.id,
      userId,
      role: 'member',
    },
    include: {
      group: true,
    },
  });
}

/**
 * Obtener la tabla de posiciones (leaderboard) ordenada de un grupo.
 */
export async function getGroupLeaderboard(groupId: number, userId: number) {
  // 1. Validar que el usuario sea miembro del grupo
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) {
    const error = new Error('No tienes permiso para ver la tabla de posiciones de este grupo.') as any;
    error.statusCode = 403;
    throw error;
  }

  // 2. Obtener todos los miembros del grupo
  const members = await db.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  // 3. Obtener todas las predicciones puntuadas de este grupo
  const predictions = await db.matchPrediction.findMany({
    where: {
      groupId,
      OR: [
        { winnerPoints: { not: null } },
        { exactScorePoints: { not: null } },
      ],
    },
  });

  // 4. Calcular puntos en memoria (es ultra rápido por estar limitado a 50 miembros)
  const leaderboard = members.map((member) => {
    const userPreds = predictions.filter((p) => p.userId === member.userId);

    let aciertosGanador = 0;
    let aciertosExacto = 0;
    let puntosTotales = 0;

    userPreds.forEach((pred) => {
      const w = pred.winnerPoints ?? 0;
      const e = pred.exactScorePoints ?? 0;
      puntosTotales += (w + e);
      if (w > 0) aciertosGanador++;
      if (e > 0) aciertosExacto++;
    });

    return {
      userId: member.user.id,
      displayName: member.user.displayName,
      role: member.role,
      aciertosGanador,
      aciertosExacto,
      puntosTotales,
    };
  });

  // 5. Ordenar: 1° puntos totales DESC, 2° aciertos exactos DESC, 3° aciertos ganador DESC
  return leaderboard.sort((a, b) => {
    if (b.puntosTotales !== a.puntosTotales) {
      return b.puntosTotales - a.puntosTotales;
    }
    if (b.aciertosExacto !== a.aciertosExacto) {
      return b.aciertosExacto - a.aciertosExacto;
    }
    return b.aciertosGanador - a.aciertosGanador;
  });
}

/**
 * Elimina un grupo si el solicitante es el creador y es el único miembro.
 */
export async function deleteGroup(groupId: number, userId: number) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      _count: {
        select: { members: true },
      },
    },
  });

  if (!group) {
    const error = new Error('El grupo solicitado no existe.') as any;
    error.statusCode = 404;
    throw error;
  }

  // 1. Verificar que sea el creador del grupo
  if (group.creatorId !== userId) {
    const error = new Error('No tienes permisos para eliminar este grupo (solo el creador puede hacerlo).') as any;
    error.statusCode = 403;
    throw error;
  }

  // 2. Verificar que no haya otros miembros unidos
  if (group._count.members > 1) {
    const error = new Error('No puedes eliminar el grupo porque ya tiene otros participantes unidos.') as any;
    error.statusCode = 400;
    throw error;
  }

  // 3. Eliminar el grupo (Prisma Cascade limpia las membresías e invitaciones solas)
  await db.group.delete({
    where: { id: groupId },
  });

  return { id: groupId };
}