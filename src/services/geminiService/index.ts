// Live Gemini SDK — re-enable when API quota is available (set GEMINI_USE_MOCK=false)
// import { GoogleGenAI, Type } from "@google/genai";
import type { PlantAnalysisInput, PlantAnalysisResult } from "./types";

/** Mock mode on by default until Gemini quota resets. Set GEMINI_USE_MOCK=false to use live API. */
const USE_MOCK_GEMINI = process.env.GEMINI_USE_MOCK !== "false";

// const GEMINI_MODEL = "gemini-2.0-flash";
//
// const PLANT_ANALYSIS_JSON_SCHEMA = {
//   type: Type.OBJECT,
//   properties: {
//     health_score: {
//       type: Type.INTEGER,
//       description: "Plant health score from 0 to 100.",
//     },
//     summary: {
//       type: Type.STRING,
//       description: "Brief health assessment narrative.",
//     },
//     recommendations: {
//       type: Type.ARRAY,
//       items: { type: Type.STRING },
//       description: "Actionable care recommendations.",
//     },
//   },
//   required: ["health_score", "summary", "recommendations"],
//   propertyOrdering: ["health_score", "summary", "recommendations"],
// } as const;

export class GeminiServiceError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string = "AI health analysis is currently unavailable.",
  ) {
    super(message);
    this.name = "GeminiServiceError";
  }
}

function buildMockPlantAnalysis(input: PlantAnalysisInput): PlantAnalysisResult {
  const speciesLabel = input.species.trim() || "unspecified species";
  const weatherPreview =
    input.weatherContext.length > 160
      ? `${input.weatherContext.slice(0, 160)}…`
      : input.weatherContext;

  return {
    health_score: 72,
    summary: [
      `[Mock AI] Placeholder health report for "${input.plantName}" (${speciesLabel}).`,
      "Gemini is bypassed while API quota is exceeded — weather and database layers are still live.",
      `Environmental context received: ${weatherPreview}`,
    ].join(" "),
    recommendations: [
      "Adjust watering if humidity is low or soil dries quickly.",
      "Provide bright, indirect light and rotate the pot weekly.",
      "Inspect leaves for pests or yellowing every few days.",
    ],
  };
}

// function getGeminiClient(): GoogleGenAI {
//   const apiKey = process.env.GEMINI_API_KEY?.trim();
//   if (!apiKey) {
//     throw new GeminiServiceError(
//       "GEMINI_API_KEY is not configured",
//       "AI analysis service is not configured.",
//     );
//   }
//   return new GoogleGenAI({ apiKey });
// }
//
// function buildAnalysisPrompt(input: PlantAnalysisInput): string {
//   return [
//     "You are PlantMind, an expert plant health analyst for a digital twin platform.",
//     "Analyze the plant's likely health given its identity and local weather context.",
//     "Be practical, concise, and actionable. Score health from 0 (critical) to 100 (excellent).",
//     "",
//     `Plant name: ${input.plantName}`,
//     `Species: ${input.species || "Unknown"}`,
//     "",
//     "Weather context:",
//     input.weatherContext,
//     "",
//     "Return JSON only with health_score (integer 0-100), summary (2-4 sentences),",
//     "and recommendations (3-5 short actionable strings).",
//   ].join("\n");
// }
//
// function coercePlantAnalysisResult(value: unknown): PlantAnalysisResult | null {
//   if (typeof value !== "object" || value === null) {
//     return null;
//   }
//   const record = value as Record<string, unknown>;
//
//   const rawScore = record.health_score;
//   if (typeof rawScore !== "number" || !Number.isFinite(rawScore)) {
//     return null;
//   }
//
//   const summary =
//     typeof record.summary === "string" ? record.summary.trim() : "";
//   if (!summary) {
//     return null;
//   }
//
//   if (!Array.isArray(record.recommendations)) {
//     return null;
//   }
//
//   const recommendations = record.recommendations
//     .filter((item): item is string => typeof item === "string")
//     .map((item) => item.trim())
//     .filter((item) => item.length > 0);
//
//   if (recommendations.length === 0) {
//     return null;
//   }
//
//   return {
//     health_score: Math.min(100, Math.max(0, Math.round(rawScore))),
//     summary,
//     recommendations,
//   };
// }
//
// async function analyzePlantHealthLive(
//   input: PlantAnalysisInput,
// ): Promise<PlantAnalysisResult> {
//   const plantName = input.plantName.trim();
//   const ai = getGeminiClient();
//   const prompt = buildAnalysisPrompt({
//     plantName,
//     species: input.species.trim(),
//     weatherContext: input.weatherContext,
//   });
//
//   const response = await ai.models.generateContent({
//     model: GEMINI_MODEL,
//     contents: prompt,
//     config: {
//       responseMimeType: "application/json",
//       responseJsonSchema: PLANT_ANALYSIS_JSON_SCHEMA,
//     },
//   });
//
//   const text = response.text?.trim();
//   if (!text) {
//     throw new GeminiServiceError(
//       "Gemini returned an empty response",
//       "AI analysis returned no results.",
//     );
//   }
//
//   let parsed: unknown;
//   try {
//     parsed = JSON.parse(text);
//   } catch {
//     console.error("[geminiService] Invalid JSON in response:", text.slice(0, 200));
//     throw new GeminiServiceError(
//       "Gemini response was not valid JSON",
//       "AI analysis returned invalid data.",
//     );
//   }
//
//   const result = coercePlantAnalysisResult(parsed);
//   if (!result) {
//     console.error("[geminiService] Response failed coercion:", parsed);
//     throw new GeminiServiceError(
//       "Gemini response did not match expected schema",
//       "AI analysis returned incomplete data.",
//     );
//   }
//
//   return result;
// }

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

  if (USE_MOCK_GEMINI) {
    console.warn(
      "[geminiService] GEMINI_USE_MOCK active — returning dummy AI analysis (no API call).",
    );
    return buildMockPlantAnalysis({
      plantName,
      species: input.species.trim(),
      weatherContext: input.weatherContext,
    });
  }

  // When quota resets: uncomment live helpers above, import @google/genai, and:
  // return analyzePlantHealthLive({ plantName, species: input.species.trim(), weatherContext: input.weatherContext });

  throw new GeminiServiceError(
    "Live Gemini path is disabled in code — set GEMINI_USE_MOCK=true or restore analyzePlantHealthLive.",
    "AI analysis is temporarily unavailable.",
  );
}
