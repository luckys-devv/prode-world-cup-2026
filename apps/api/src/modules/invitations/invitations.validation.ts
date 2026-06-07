import { z } from 'zod';

export const inviteByEmailSchema = z.object({
  groupId: z.number().int('El ID de grupo debe ser un número entero'),
  email: z.string().email('Debe ingresar un correo electrónico válido'),
});

export type InviteByEmailInput = z.infer<typeof inviteByEmailSchema>;