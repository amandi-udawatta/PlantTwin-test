import { GoogleGenAI, Type } from "@google/genai";
import type { PlantAnalysisInput, PlantAnalysisResult } from "./types";

const GEMINI_MODEL = "gemini-2.0-flash";

/** Set GEMINI_USE_MOCK=true in .env.local to bypass the API. */
const USE_MOCK_GEMINI = process.env.GEMINI_USE_MOCK === "true";

const PLANT_ANALYSIS_JSON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    health_score: {
      type: Type.INTEGER,
      description: "Plant health score from 0 to 100.",
    },
    summary: {
      type: Type.STRING,
      description: "Brief health assessment narrative.",
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Actionable care recommendations.",
    },
  },
  required: ["health_score", "summary", "recommendations"],
  propertyOrdering: ["health_score", "summary", "recommendations"],
} as const;

export class GeminiServiceError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string = "AI health analysis is currently unavailable.",
  ) {
    super(message);
    this.name = "GeminiServiceError";
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiServiceError(
      "GEMINI_API_KEY is not configured",
      "AI analysis service is not configured.",
    );
  }
  return new GoogleGenAI({ apiKey });
}

function buildAnalysisPrompt(input: PlantAnalysisInput): string {
  const imageNote = input.imageBase64
    ? "A plant photo is attached — use it to inform leaf color, wilting, pests, and overall vigor."
    : "No photo was provided — base the assessment on plant identity and weather only.";

  return [
    "You are PlantMind, an expert plant health analyst for a digital twin platform.",
    "Analyze the plant's likely health given its identity, weather context, and any photo.",
    "Be practical, concise, and actionable. Score health from 0 (critical) to 100 (excellent).",
    imageNote,
    "",
    `Plant name: ${input.plantName}`,
    `Species: ${input.species || "Unknown"}`,
    "",
    "Weather context:",
    input.weatherContext,
    "",
    "Return JSON only with health_score (integer 0-100), summary (2-4 sentences),",
    "and recommendations (3-5 short actionable strings).",
  ].join("\n");
}

function buildMockPlantAnalysis(input: PlantAnalysisInput): PlantAnalysisResult {
  const speciesLabel = input.species.trim() || "unspecified species";
  const weatherPreview =
    input.weatherContext.length > 120
      ? `${input.weatherContext.slice(0, 120)}…`
      : input.weatherContext;
  const imageNote = input.imageBase64
    ? " A plant photo was attached (mock mode — image not analyzed)."
    : "";

  return {
    health_score: 72,
    summary: [
      `[Mock AI] Placeholder report for "${input.plantName}" (${speciesLabel}).${imageNote}`,
      `Context: ${weatherPreview}`,
    ].join(" "),
    recommendations: [
      "Adjust watering if humidity is low or soil dries quickly.",
      "Provide bright, indirect light and rotate the pot weekly.",
      "Inspect leaves for pests or yellowing every few days.",
    ],
  };
}

function coercePlantAnalysisResult(value: unknown): PlantAnalysisResult | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;

  const rawScore = record.health_score;
  if (typeof rawScore !== "number" || !Number.isFinite(rawScore)) {
    return null;
  }

  const summary =
    typeof record.summary === "string" ? record.summary.trim() : "";
  if (!summary) {
    return null;
  }

  if (!Array.isArray(record.recommendations)) {
    return null;
  }

  const recommendations = record.recommendations
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (recommendations.length === 0) {
    return null;
  }

  return {
    health_score: Math.min(100, Math.max(0, Math.round(rawScore))),
    summary,
    recommendations,
  };
}

async function analyzePlantHealthLive(
  input: PlantAnalysisInput,
): Promise<PlantAnalysisResult> {
  const ai = getGeminiClient();
  const prompt = buildAnalysisPrompt(input);

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
    [];

  if (input.imageBase64 && input.imageMimeType) {
    parts.push({
      inlineData: {
        mimeType: input.imageMimeType,
        data: input.imageBase64,
      },
    });
  }
  parts.push({ text: prompt });

  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: PLANT_ANALYSIS_JSON_SCHEMA,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Gemini error";
    console.error("[geminiService] generateContent failed:", message);
    throw new GeminiServiceError(
      `Gemini API request failed: ${message}`,
      "AI health analysis is currently unavailable.",
    );
  }

  const text = response.text?.trim();
  if (!text) {
    throw new GeminiServiceError(
      "Gemini returned an empty response",
      "AI analysis returned no results.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[geminiService] Invalid JSON in response:", text.slice(0, 200));
    throw new GeminiServiceError(
      "Gemini response was not valid JSON",
      "AI analysis returned invalid data.",
    );
  }

  const result = coercePlantAnalysisResult(parsed);
  if (!result) {
    console.error("[geminiService] Response failed coercion:", parsed);
    throw new GeminiServiceError(
      "Gemini response did not match expected schema",
      "AI analysis returned incomplete data.",
    );
  }

  return result;
}

export async function analyzePlantHealth(
  input: PlantAnalysisInput,
): Promise<PlantAnalysisResult> {
  const plantName = input.plantName.trim();
  if (!plantName) {
    throw new GeminiServiceError(
      "Plant name is required for analysis",
      "Please provide a plant name.",
    );
  }

  const normalizedInput: PlantAnalysisInput = {
    plantName,
    species: input.species.trim(),
    weatherContext: input.weatherContext,
    imageBase64: input.imageBase64,
    imageMimeType: input.imageMimeType,
  };

  if (USE_MOCK_GEMINI) {
    console.warn("[geminiService] GEMINI_USE_MOCK=true — skipping Gemini API call.");
    return buildMockPlantAnalysis(normalizedInput);
  }

  return analyzePlantHealthLive(normalizedInput);
}
