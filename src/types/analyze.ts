import type { PlantLogRow } from "@/types/plantLog";

export interface AnalyzePlantRequest {
  plantName: string;
  species?: string;
  city: string;
}

export interface AnalyzePlantResponse {
  log: PlantLogRow;
}

export interface AnalyzePlantErrorResponse {
  error: string;
}
