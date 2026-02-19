import { z } from 'zod';

export const teamNameSchema = z.string().trim().min(1, 'Nome obrigatório').max(100, 'Nome muito longo');
export const logoUrlSchema = z.string().trim().url('URL inválida').max(500, 'URL muito longa').optional().or(z.literal(''));
export const championshipNameSchema = z.string().trim().min(1, 'Nome obrigatório').max(150, 'Nome muito longo');
export const descriptionSchema = z.string().trim().max(500, 'Descrição muito longa').optional().or(z.literal(''));
export const goalsSchema = z.number().int().min(0, 'Gols inválidos').max(99, 'Gols inválidos').nullable();
export const gameDayNameSchema = z.string().trim().min(1, 'Nome obrigatório').max(100, 'Nome muito longo');

export const createTeamSchema = z.object({
  name: teamNameSchema,
  logo: logoUrlSchema,
});

export const createChampionshipSchema = z.object({
  name: championshipNameSchema,
  description: descriptionSchema,
  startDate: z.string().max(50).optional(),
  gameDays: z.array(z.string()).optional(),
  knockoutPhases: z.array(z.string()).optional(),
  gameDayNames: z.array(z.string().max(100)).optional(),
  qualifyingTeams: z.record(z.number().int().min(0).max(100)).optional(),
});

export const updateMatchSchema = z.object({
  homeGoals: goalsSchema.optional(),
  awayGoals: goalsSchema.optional(),
  homeWO: z.boolean().optional(),
  awayWO: z.boolean().optional(),
  played: z.boolean().optional(),
  homeTeamId: z.string().uuid().optional(),
  awayTeamId: z.string().uuid().optional(),
});

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.errors.map(e => e.message).join(', '));
  }
  return result.data;
}
