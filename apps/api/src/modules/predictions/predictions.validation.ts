import { z } from 'zod';

export const createPredictionSchema = z.object({
  matchId: z.number().int('El ID de partido debe ser un entero'),
  groupId: z.number().int('El ID de grupo debe ser un entero'),
  prediction: z.enum(['HOME_TEAM', 'AWAY_TEAM', 'DRAW'], {
    errorMap: () => ({ message: "La predicción debe ser 'HOME_TEAM', 'AWAY_TEAM' o 'DRAW'" }),
  }),
  predictedHomeScore: z.number().int().nonnegative('Los goles no pueden ser negativos').nullable().optional(),
  predictedAwayScore: z.number().int().nonnegative('Los goles no pueden ser negativos').nullable().optional(),
});

export type CreatePredictionInput = z.infer<typeof createPredictionSchema>;