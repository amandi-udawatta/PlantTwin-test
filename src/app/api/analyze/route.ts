import { NextResponse } from "next/server";
import {
  analyzePlantHealth,
  GeminiServiceError,
} from "@/services/geminiService";
import {
  insertPlantLog,
  SupabaseServiceError,
} from "@/services/supabaseService";
import { fetchWeatherByCity } from "@/services/weatherService";
import type {
  AnalyzePlantErrorResponse,
  AnalyzePlantRequest,
  AnalyzePlantResponse,
} from "@/types/analyze";
import type { PlantLogRow } from "@/types/plantLog";

export const runtime = "nodejs";

const MAX_IMAGE_BASE64_LENGTH = 6_000_000;

function isAnalyzePlantRequest(value: unknown): value is AnalyzePlantRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const imageOk =
    record.plantImageBase64 === undefined ||
    (typeof record.plantImageBase64 === "string" &&
      record.plantImageMimeType !== undefined &&
      typeof record.plantImageMimeType === "string");
  return (
    typeof record.plantName === "string" &&
    (record.species === undefined || typeof record.species === "string") &&
    typeof record.city === "string" &&
    imageOk
  );
}

function validationError(message: string): NextResponse<AnalyzePlantErrorResponse> {
  return NextResponse.json({ error: message }, { status: 400 });
}

function serviceError(
  message: string,
  status: number,
): NextResponse<AnalyzePlantErrorResponse> {
  return NextResponse.json({ error: message }, { status });
}

async function parseRequestBody(
  request: Request,
): Promise<
  | { ok: true; body: AnalyzePlantRequest }
  | { ok: false; response: NextResponse<AnalyzePlantErrorResponse> }
> {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return {
      ok: false,
      response: validationError("Request body is required."),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return {
      ok: false,
      response: validationError("Invalid JSON body."),
    };
  }

  if (!isAnalyzePlantRequest(parsed)) {
    return {
      ok: false,
      response: validationError(
        "Request must include plantName (string), city (string), and optional species (string).",
      ),
    };
  }

  return { ok: true, body: parsed };
}

export async function POST(
  request: Request,
): Promise<NextResponse<AnalyzePlantResponse | AnalyzePlantErrorResponse>> {
  const parsedRequest = await parseRequestBody(request);
  if (!parsedRequest.ok) {
    return parsedRequest.response;
  }

  const plantName = parsedRequest.body.plantName.trim();
  const species = parsedRequest.body.species?.trim() ?? "";
  const city = parsedRequest.body.city.trim();

  if (!plantName) {
    return validationError("Plant name is required.");
  }
  if (!city) {
    return validationError("City is required for weather context.");
  }

  try {
    const weather = await fetchWeatherByCity(city);

    if (weather.isFallback) {
      console.warn(
        `[api/analyze] Using fallback weather context for city="${city}"`,
      );
    }

    const imageBase64 = parsedRequest.body.plantImageBase64?.trim();
    const imageMimeType = parsedRequest.body.plantImageMimeType?.trim();

    if (imageBase64 && imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      return validationError("Plant image is too large. Use a smaller photo.");
    }

    const analysis = await analyzePlantHealth({
      plantName,
      species,
      weatherContext: weather.contextText,
      imageBase64: imageBase64 || undefined,
      imageMimeType: imageMimeType || undefined,
    });

    const log: PlantLogRow = await insertPlantLog({
      plant_name: plantName,
      species: species.length > 0 ? species : null,
      health_score: analysis.health_score,
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      weather_context: weather.contextText,
    });

    return NextResponse.json({ log } satisfies AnalyzePlantResponse, {
      status: 201,
    });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return serviceError(error.userMessage, 502);
    }
    if (error instanceof SupabaseServiceError) {
      return serviceError(error.userMessage, 500);
    }

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[api/analyze] Unhandled error:", message);
    return serviceError("Analysis failed. Please try again.", 500);
  }
}
