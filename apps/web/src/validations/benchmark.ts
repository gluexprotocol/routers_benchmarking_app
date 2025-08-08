import { z } from "zod";

export const detailedResultsQuery = z.object({
  run_id: z.coerce.number().int().positive().optional(),
  chain: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(10).max(200).default(50),
});

export const winRatesQuery = z.object({
  chain: z.string().trim().min(1).optional(),
  run_id: z.coerce.number().int().positive().optional(),
});
