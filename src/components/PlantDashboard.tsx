"use client";

import { FormEvent, useState } from "react";
import type {
  AnalyzePlantErrorResponse,
  AnalyzePlantResponse,
} from "@/types/analyze";
import type { PlantLogRow } from "@/types/plantLog";

function getWeatherLabel(weatherContext: string): string {
  if (weatherContext.includes("Weather data unavailable")) {
    return "Unavailable";
  }
  const conditionMatch = weatherContext.match(/Condition:\s*([^|]+)/);
  if (conditionMatch) {
    return conditionMatch[1].trim();
  }
  const locationMatch = weatherContext.match(/Location:\s*([^|]+)/);
  if (locationMatch) {
    return locationMatch[1].trim();
  }
  return weatherContext.length > 48
    ? `${weatherContext.slice(0, 48)}…`
    : weatherContext;
}

function getHealthScoreClass(score: number): string {
  if (score >= 70) {
    return "text-botanical-accent";
  }
  if (score >= 40) {
    return "text-botanical-warn";
  }
  return "text-red-400";
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-botanical-border bg-botanical-bg/60 px-4 py-3">
      <p className="text-xs text-botanical-muted">{label}</p>
      <p
        className="mt-0.5 truncate text-lg font-semibold text-white"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function FormField({
  id,
  label,
  name,
  placeholder,
  value,
  onChange,
  disabled,
  required = false,
}: {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-botanical-muted">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-botanical-border/80 bg-botanical-bg/50 px-6 py-16 text-center">
      <p className="mb-3 text-4xl opacity-40" aria-hidden>
        🌿
      </p>
      <p className="text-sm text-botanical-muted">
        No analysis yet. Run an ingestion to see results.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center rounded-xl border border-botanical-border/60 bg-botanical-bg/50 px-6 py-16 text-center"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingSpinner />
      <p className="text-sm text-botanical-muted">
        Fetching weather, running AI analysis, and saving…
      </p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-botanical-border border-t-botanical-accent" />
  );
}

function ResultsContent({ log }: { log: PlantLogRow }) {
  const weatherLabel = getWeatherLabel(log.weather_context);
  const scoreClass = getHealthScoreClass(log.health_score);
  const isEstimatedWeather = log.weather_context.includes(
    "live data unavailable",
  );

  return (
    <div className="transition-opacity duration-300">
      {isEstimatedWeather ? (
        <p className="mb-4 rounded-lg border border-botanical-warn/30 bg-botanical-warn/10 px-3 py-2 text-xs text-botanical-warn">
          Live weather was unavailable — analysis used estimated context.
        </p>
      ) : null}

      <div className="rounded-xl border border-botanical-border/80 bg-botanical-bg/50 p-5">
        <div className="flex items-start justify-between gap-4">
          <PlantTitle log={log} />
          <div className="text-right">
            <p className="text-xs text-botanical-muted">Score</p>
            <p className={`text-3xl font-bold tabular-nums ${scoreClass}`}>
              {log.health_score}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-botanical-leaf/90">
          {log.summary}
        </p>
        {log.species ? (
          <p className="mt-3 text-xs text-botanical-muted">
            Species: <span className="text-botanical-leaf">{log.species}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-botanical-muted">
          Recommendations
        </h3>
        <ul className="space-y-2">
          {log.recommendations.map((item, index) => (
            <li
              key={`${log.id}-rec-${index}`}
              className="flex gap-2 rounded-lg border border-botanical-border/60 bg-botanical-bg/40 px-3 py-2.5 text-sm text-botanical-leaf"
            >
              <span className="text-botanical-accent" aria-hidden>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-botanical-border bg-botanical-bg/60 px-4 py-3">
          <p className="text-xs text-botanical-muted">Health score</p>
          <p className={`mt-0.5 text-2xl font-bold ${scoreClass}`}>
            {log.health_score}
            <span className="text-sm font-normal text-botanical-muted">/100</span>
          </p>
        </div>
        <MetricCard label="Weather" value={weatherLabel} />
      </div>

      <p className="mt-4 text-right text-xs text-botanical-muted/70">
        Saved · {new Date(log.created_at).toLocaleString()}
      </p>
    </div>
  );
}

function PlantTitle({ log }: { log: PlantLogRow }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white">{log.plant_name}</h3>
      <p className="mt-0.5 text-xs text-botanical-muted">
        ID {log.id.slice(0, 8)}…
      </p>
    </div>
  );
}

async function parseAnalyzeResponse(
  response: Response,
): Promise<
  | { ok: true; data: AnalyzePlantResponse }
  | { ok: false; error: string }
> {
  const rawText = await response.text();

  if (!rawText.trim()) {
    return {
      ok: false,
      error: `Server returned ${response.status} with an empty response.`,
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch {
    console.error(
      "[PlantDashboard] Non-JSON response:",
      response.status,
      rawText.slice(0, 200),
    );
    return {
      ok: false,
      error: `Server returned ${response.status} with invalid JSON.`,
    };
  }

  if (!response.ok) {
    const errorPayload = payload as AnalyzePlantErrorResponse;
    const message =
      typeof errorPayload.error === "string" && errorPayload.error.length > 0
        ? errorPayload.error
        : `Analysis failed (HTTP ${response.status}).`;
    console.error("[PlantDashboard] API error:", response.status, message);
    return { ok: false, error: message };
  }

  const successPayload = payload as AnalyzePlantResponse;
  if (
    typeof successPayload !== "object" ||
    successPayload === null ||
    !successPayload.log ||
    typeof successPayload.log.id !== "string"
  ) {
    console.error("[PlantDashboard] Unexpected success payload:", payload);
    return {
      ok: false,
      error: "Server returned an unexpected response shape.",
    };
  }

  return { ok: true, data: successPayload };
}

export default function PlantDashboard() {
  const [plantName, setPlantName] = useState("");
  const [species, setSpecies] = useState("");
  const [city, setCity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlantLogRow | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantName: plantName.trim(),
          species: species.trim() || undefined,
          city: city.trim(),
        }),
      });

      const parsed = await parseAnalyzeResponse(response);

      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }

      setResult(parsed.data.log);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Network error — could not reach the analysis service.";
      console.error("[PlantDashboard] Submit failed:", message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-2">
      <section className="panel">
        <h2 className="mb-1 text-lg font-medium text-white">Plant Ingestion</h2>
        <p className="mb-6 text-sm text-botanical-muted">
          Submit plant details and location to generate an AI health report.
        </p>

        <form
          className="space-y-4"
          aria-label="Plant ingestion form"
          onSubmit={handleSubmit}
        >
          <FormField
            id="plant-name"
            label="Plant name"
            name="plantName"
            placeholder="e.g. Monstera Deliciosa"
            value={plantName}
            onChange={setPlantName}
            disabled={isLoading}
            required
          />
          <FormField
            id="species"
            label="Species"
            name="species"
            placeholder="e.g. Monstera deliciosa"
            value={species}
            onChange={setSpecies}
            disabled={isLoading}
          />
          <FormField
            id="city"
            label="City (weather context)"
            name="city"
            placeholder="e.g. London"
            value={city}
            onChange={setCity}
            disabled={isLoading}
            required
          />

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? "Analyzing…" : "Analyze plant health"}
          </button>
        </form>
      </section>

      <section className="panel flex flex-col">
        <h2 className="mb-1 text-lg font-medium text-white">Health Report</h2>
        <p className="mb-6 text-sm text-botanical-muted">
          Live metrics and AI recommendations from your latest analysis.
        </p>

        {isLoading ? (
          <LoadingState />
        ) : result ? (
          <ResultsContent log={result} />
        ) : (
          <EmptyState />
        )}
      </section>
    </div>
  );
}
