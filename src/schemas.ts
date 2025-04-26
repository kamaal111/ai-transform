import z from 'zod';

export const TransformResponseSchema = z.object({ code: z.string() });
