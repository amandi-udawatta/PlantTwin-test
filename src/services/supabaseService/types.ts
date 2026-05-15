import type { PlantLogInsert, PlantLogRow } from "@/types/plantLog";

export type { PlantLogInsert, PlantLogRow };

export interface SupabaseServiceErrorOptions {
  userMessage?: string;
  cause?: unknown;
}
