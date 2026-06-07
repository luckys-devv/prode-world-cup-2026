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