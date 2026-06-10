import { db } from '../../config/database.js';
import { resend } from '../../config/resend.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { InviteByEmailInput } from './invitations.validation.js';

/**
 * Envía una invitación por correo electrónico a un usuario para unirse a un grupo.
 */
export async function inviteUser(senderId: number, input: InviteByEmailInput) {
  const { groupId, email } = input;
  const targetEmail = email.trim().toLowerCase();

  // 1. Validar que el emisor sea miembro administrador del grupo
  const senderMembership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: senderId } },
  });

  if (!senderMembership || senderMembership.role !== 'admin') {
    const error = new Error('Solo el administrador del grupo puede enviar invitaciones.') as any;
    error.statusCode = 403;
    throw error;
  }

  // 2. Obtener info del grupo y cantidad actual de miembros
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      creator: { select: { displayName: true } },
      _count: { select: { members: true } },
    },
  });

  if (!group) {
    const error = new Error('El grupo especificado no existe.') as any;
    error.statusCode = 404;
    throw error;
  }

  if (group._count.members >= group.maxMembers) {
    const error = new Error('La cantidad maxima de miembros es de 50 personas.') as any;
    error.statusCode = 400;
    throw error;
  }

  // 3. Verificar si el destinatario ya forma parte del grupo
  const existingMember = await db.user.findFirst({
    where: {
      email: targetEmail,
      groupMemberships: { some: { groupId } },
    },
  });

  if (existingMember) {
    const error = new Error('Este usuario ya forma parte del grupo.') as any;
    error.statusCode = 409;
    throw error;
  }

  // 4. Buscar si el usuario ya está registrado en el sistema
  const registeredReceiver = await db.user.findUnique({
    where: { email: targetEmail },
  });

  // 5. Crear la invitación en la base de datos (upsert para evitar duplicar)
  const invitation = await db.invitation.upsert({
    where: {
      groupId_email: { groupId, email: targetEmail },
    },
    update: {
      status: 'pending',
      senderId,
      receiverId: registeredReceiver ? registeredReceiver.id : null,
    },
    create: {
      groupId,
      senderId,
      email: targetEmail,
      receiverId: registeredReceiver ? registeredReceiver.id : null,
      status: 'pending',
    },
  });

  // 6. Enviar correo electrónico
  const joinUrl = `${env.FRONTEND_URL}/group/join/${group.inviteCode}`;
  const emailSubject = `Te invitaron a jugar al Prode con Amigos para el Mundial 2026: ${group.name}`;
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #6c5ce7;">¡Hola!</h2>
      <p style="font-size: 16px; line-height: 1.5;">
        <strong>${group.creator.displayName}</strong> te ha invitado a unirte a su grupo <strong>"${group.name}"</strong> para jugar al prode con amigos del Mundial FIFA 2026.
      </p>
      ${group.prizeDescription ? `<p style="background-color: #f1f0ff; padding: 15px; border-left: 4px solid #6c5ce7; font-size: 15px; border-radius: 4px;"><strong>Premio en juego:</strong> ${group.prizeDescription}</p>` : ''}
      <div style="margin: 30px 0; text-align: center;">
        <a href="${joinUrl}" style="background-color: #6c5ce7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Aceptar Invitación</a>
      </div>
      <p style="font-size: 13px; color: #888; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
        Si el botón no funciona, podés copiar y pegar este enlace en tu navegador:<br/>
        <a href="${joinUrl}" style="color: #6c5ce7;">${joinUrl}</a>
      </p>
    </div>
  `;

  if (resend) {
    try {
      logger.info(`Enviando email real con Resend a ${targetEmail}...`);
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: targetEmail,
        subject: emailSubject,
        html: emailHtml,
      });
      logger.info(`Email enviado con éxito a ${targetEmail}.`);
    } catch (err: any) {
      logger.error('Error al enviar correo con Resend:', err.message);
      // No frenamos la respuesta del endpoint, para que en la BD quede guardada
    }
  } else {
    // Si no está configurado Resend, simulamos imprimiendo el HTML en la consola
    logger.info('════════════════════════════════════════════════════════════');
    logger.info('📧 EMAIL SIMULADO (Resend no configurado):');
    logger.info(`Para: ${targetEmail}`);
    logger.info(`Asunto: ${emailSubject}`);
    logger.info(`Enlace de Unión: ${joinUrl}`);
    logger.info('════════════════════════════════════════════════════════════');
  }

  return invitation;
}

/**
 * Lista las invitaciones pendientes del usuario actual (inbox) aplanadas.
 */
export async function getPendingInvitations(userId: number, userEmail: string) {
  const invitations = await db.invitation.findMany({
    where: {
      OR: [
        { receiverId: userId },
        { email: userEmail.toLowerCase() },
      ],
      status: 'pending',
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          prizeDescription: true,
        },
      },
      sender: {
        select: {
          displayName: true,
        },
      },
    },
  });

  return invitations.map((inv) => ({
    id: inv.id,
    groupId: inv.groupId,
    groupName: inv.group.name,
    senderName: inv.sender.displayName,
    email: inv.email,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
  }));
}
/**
 * Acepta una invitación, marcando su estado como aceptada y sumando al usuario al grupo.
 */
export async function acceptInvitation(invitationId: number, userId: number, userEmail: string) {
  const invitation = await db.invitation.findUnique({
    where: { id: invitationId },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (!invitation) {
    const error = new Error('La invitación no existe.') as any;
    error.statusCode = 404;
    throw error;
  }

  if (invitation.status !== 'pending') {
    const error = new Error('Esta invitación ya ha sido aceptada o rechazada anteriormente.') as any;
    error.statusCode = 400;
    throw error;
  }

  // Validar destinatario por ID o Email
  const isCorrectReceiver =
    invitation.receiverId === userId ||
    invitation.email.toLowerCase() === userEmail.toLowerCase();

  if (!isCorrectReceiver) {
    const error = new Error('No tienes permiso para aceptar esta invitación.') as any;
    error.statusCode = 403;
    throw error;
  }

  if (invitation.group._count.members >= invitation.group.maxMembers) {
    const error = new Error('El grupo está lleno. No podés ingresar.') as any;
    error.statusCode = 400;
    throw error;
  }

  // Verificar por las dudas si ya era miembro
  const existingMembership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId: invitation.groupId, userId } },
  });

  if (existingMembership) {
    // Si ya era miembro, solo actualizamos el estado de la invitación
    await db.invitation.update({
      where: { id: invitationId },
      data: { status: 'accepted', receiverId: userId },
    });
    return existingMembership;
  }

  // Transacción para registrar el ingreso y cambiar estado de la invitación
  return await db.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: invitationId },
      data: { status: 'accepted', receiverId: userId },
    });

    return await tx.groupMember.create({
      data: {
        groupId: invitation.groupId,
        userId,
        role: 'member',
      },
      include: {
        group: true,
      },
    });
  });
}

/**
 * Rechaza una invitación pendiente.
 */
export async function rejectInvitation(invitationId: number, userId: number, userEmail: string) {
  const invitation = await db.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    const error = new Error('La invitación no existe.') as any;
    error.statusCode = 404;
    throw error;
  }

  if (invitation.status !== 'pending') {
    const error = new Error('Esta invitación ya ha sido aceptada o rechazada anteriormente.') as any;
    error.statusCode = 400;
    throw error;
  }

  const isCorrectReceiver =
    invitation.receiverId === userId ||
    invitation.email.toLowerCase() === userEmail.toLowerCase();

  if (!isCorrectReceiver) {
    const error = new Error('No tienes permiso para rechazar esta invitación.') as any;
    error.statusCode = 403;
    throw error;
  }

  return await db.invitation.update({
    where: { id: invitationId },
    data: {
      status: 'rejected',
      receiverId: userId,
    },
  });
}