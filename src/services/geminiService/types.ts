export interface PlantAnalysisInput {
  plantName: string;
  species: string;
  weatherContext: string;
}

export interface PlantAnalysisResult {
  health_score: number;
  summary: string;
  recommendations: string[];
}
