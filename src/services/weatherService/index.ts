import type { WeatherApiCurrentResponse, WeatherContext } from "./types";

const WEATHER_API_BASE = "https://api.weatherapi.com/v1";

const FALLBACK_CONDITION = "Weather data unavailable";
const FALLBACK_CONTEXT_PREFIX =
  "Weather context (estimated — live data unavailable)";

export class WeatherServiceError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string = "Please enter a valid city name.",
  ) {
    super(message);
    this.name = "WeatherServiceError";
  }
}

function getWeatherApiKey(): string | null {
  const key = process.env.WEATHER_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export function createFallbackWeatherContext(queryCity: string): WeatherContext {
  const city = queryCity.trim() || "Unknown location";
  const contextText = [
    `${FALLBACK_CONTEXT_PREFIX} for ${city}.`,
    `Location: ${city} (region and country unknown).`,
    `Condition: ${FALLBACK_CONDITION}.`,
    "Temperature, humidity, and wind readings are not available.",
    "Proceed with general indoor plant care assumptions.",
  ].join(" | ");

  return {
    city,
    region: "Unknown",
    country: "Unknown",
    tempC: null,
    condition: FALLBACK_CONDITION,
    humidity: null,
    windKph: null,
    feelsLikeC: null,
    precipitationMm: null,
    uv: null,
    contextText,
    isFallback: true,
  };
}

/**
 * Safely extracts fields from a WeatherAPI current.json payload.
 * Never throws — returns fallback context on any parse/extraction failure.
 */
export function extractWeatherContext(
  payload: unknown,
  queryCity: string,
): WeatherContext {
  try {
    const root = payload as WeatherApiCurrentResponse;
    const location = root.location ?? {};
    const current = root.current ?? {};
    const condition = current.condition ?? {};

    const city = readString(location.name, queryCity.trim());
    const region = readString(location.region, "Unknown");
    const country = readString(location.country, "Unknown");
    const conditionText = readString(condition.text, "Unknown");
    const tempC = readNumber(current.temp_c);
    const humidity = readNumber(current.humidity);
    const windKph = readNumber(current.wind_kph);
    const feelsLikeC = readNumber(current.feelslike_c);
    const precipitationMm = readNumber(current.precip_mm);
    const uv = readNumber(current.uv);

    const tempLabel =
      tempC !== null ? `${tempC}°C` : "temperature unavailable";
    const feelsLabel =
      feelsLikeC !== null ? `${feelsLikeC}°C` : "n/a";
    const humidityLabel =
      humidity !== null ? `${humidity}%` : "unavailable";
    const windLabel =
      windKph !== null ? `${windKph} km/h` : "unavailable";

    const contextText = [
      `Location: ${city}, ${region}, ${country}`,
      `Condition: ${conditionText}`,
      `Temperature: ${tempLabel} (feels like ${feelsLabel})`,
      `Humidity: ${humidityLabel}`,
      `Wind: ${windLabel}`,
      current.last_updated
        ? `Last updated: ${current.last_updated}`
        : null,
    ]
      .filter((part): part is string => part !== null)
      .join(" | ");

    return {
      city,
      region,
      country,
      tempC,
      condition: conditionText,
      humidity,
      windKph,
      feelsLikeC,
      precipitationMm,
      uv,
      contextText,
      isFallback: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown extraction error";
    console.error("[weatherService] Failed to extract weather context:", message);
    return createFallbackWeatherContext(queryCity);
  }
}

function logWeatherApiError(context: string, detail: string): void {
  console.error(`[weatherService] ${context}:`, detail);
}

export async function fetchWeatherByCity(city: string): Promise<WeatherContext> {
  const trimmedCity = city.trim();
  if (!trimmedCity) {
    throw new WeatherServiceError(
      "City name is required",
      "Please enter a city name for weather context.",
    );
  }

  const apiKey = getWeatherApiKey();
  if (!apiKey) {
    logWeatherApiError("configuration", "WEATHER_API_KEY is not configured");
    return createFallbackWeatherContext(trimmedCity);
  }

  const url = new URL(`${WEATHER_API_BASE}/current.json`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", trimmedCity);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed";
    logWeatherApiError("network", message);
    return createFallbackWeatherContext(trimmedCity);
  }

  const rawText = await response.text().catch(() => "");

  if (!rawText.trim()) {
    logWeatherApiError("empty response", `HTTP ${response.status}`);
    return createFallbackWeatherContext(trimmedCity);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch {
    logWeatherApiError("invalid JSON", rawText.slice(0, 200));
    return createFallbackWeatherContext(trimmedCity);
  }

  const errorRecord = asRecord(payload)?.error as
    | { message?: string }
    | undefined;

  if (!response.ok || errorRecord?.message) {
    const apiMessage =
      errorRecord?.message ?? `HTTP ${response.status}`;
    logWeatherApiError("API error", apiMessage);
    return createFallbackWeatherContext(trimmedCity);
  }

  return extractWeatherContext(payload, trimmedCity);
}
