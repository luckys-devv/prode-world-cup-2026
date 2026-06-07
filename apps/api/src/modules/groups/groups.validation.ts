import { z } from 'zod';

// Validador individual para cada opción de puntaje
const optionConfigSchema = z.object({
  enabled: z.boolean(),
  points: z.number().int().nonnegative('Los puntos no pueden ser negativos'),
});

export const createGroupSchema = z.object({
  name: z.string()
    .min(3, 'El nombre del grupo debe tener al menos 3 caracteres')
    .max(100, 'El nombre del grupo no puede superar los 100 caracteres'),
  prizeDescription: z.string().max(255, 'La descripción del premio no puede superar los 255 caracteres').optional(),
  scoringConfig: z.object({
    winnerPrediction: optionConfigSchema,
    exactScore: optionConfigSchema,
    groupLeader: optionConfigSchema,
    champion: optionConfigSchema,
    showPredictionsBeforeStart: z.boolean().default(false),
  }).refine((config) => {
    // Regla de negocio: Al menos un método de puntuación debe estar habilitado
    return (
      config.winnerPrediction.enabled ||
      config.exactScore.enabled ||
      config.groupLeader.enabled ||
      config.champion.enabled
    );
  }, {
    message: 'Debes habilitar al menos una opción de puntaje para el grupo.',
    path: ['scoringConfig'],
  }),
});

export const updateGroupSchema = z.object({
  name: z.string()
    .min(3, 'El nombre del grupo debe tener al menos 3 caracteres')
    .max(100, 'El nombre del grupo no puede superar los 100 caracteres')
    .optional(),
  prizeDescription: z.string().max(255, 'La descripción del premio no puede superar los 255 caracteres').optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;