export interface PlantAnalysisInput {
  plantName: string;
  species: string;
  weatherContext: string;
  /** Base64-encoded image bytes (no data: prefix). */
  imageBase64?: string;
  imageMimeType?: string;
}

export interface PlantAnalysisResult {
  health_score: number;
  summary: string;
  recommendations: string[];
}
