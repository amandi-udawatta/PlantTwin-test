export interface PlantLogRow {
  id: string;
  plant_name: string;
  species: string | null;
  health_score: number;
  summary: string;
  recommendations: string[];
  weather_context: string;
  created_at: string;
}

export interface PlantLogInsert {
  plant_name: string;
  species: string | null;
  health_score: number;
  summary: string;
  recommendations: string[];
  weather_context: string;
}

export interface PlantHealthAnalysis {
  health_score: number;
  summary: string;
  recommendations: string[];
}
