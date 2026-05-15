import type { PlantLogRow } from "@/types/plantLog";

export interface AnalyzePlantRequest {
  plantName: string;
  species?: string;
  city: string;
  /** Base64 image without data-URL prefix (optional). */
  plantImageBase64?: string;
  plantImageMimeType?: string;
}

export interface AnalyzePlantResponse {
  log: PlantLogRow;
}

export interface AnalyzePlantErrorResponse {
  error: string;
}

export interface PlantLogsListResponse {
  logs: PlantLogRow[];
}
