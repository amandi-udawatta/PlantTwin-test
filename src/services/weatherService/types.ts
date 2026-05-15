/** Loose mapping of WeatherAPI.com current.json (optional fields tolerated). */
export interface WeatherApiCurrentResponse {
  location?: {
    name?: string;
    region?: string;
    country?: string;
    lat?: number;
    lon?: number;
    tz_id?: string;
    localtime?: string;
  };
  current?: {
    last_updated?: string;
    temp_c?: number;
    temp_f?: number;
    feelslike_c?: number;
    humidity?: number;
    wind_kph?: number;
    precip_mm?: number;
    uv?: number;
    condition?: {
      text?: string;
      icon?: string;
      code?: number;
    };
  };
  error?: {
    code?: number;
    message?: string;
  };
}

export interface WeatherContext {
  city: string;
  region: string;
  country: string;
  tempC: number | null;
  condition: string;
  humidity: number | null;
  windKph: number | null;
  feelsLikeC: number | null;
  precipitationMm: number | null;
  uv: number | null;
  contextText: string;
  isFallback: boolean;
}
