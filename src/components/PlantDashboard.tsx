"use client";

import ImageDropzone, { type PlantImageSelection } from "@/components/ImageDropzone";
import PlantHistoryList from "@/components/PlantHistoryList";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type {
  AnalyzePlantErrorResponse,
  AnalyzePlantResponse,
  PlantLogsListResponse,
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

interface FormFieldProps {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  required?: boolean;
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
}: FormFieldProps) {
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
    <MotionEmptyState />
  );
}

function MotionEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-botanical-border/80 bg-botanical-bg/50 px-6 py-16 text-center">
      <p className="mb-3 text-4xl opacity-40" aria-hidden>
        🌿
      </p>
      <p className="text-sm text-botanical-muted">
        No analysis yet. Run an ingestion or select a saved plant.
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
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-botanical-border border-t-botanical-accent" />
      <p className="text-sm text-botanical-muted">
        One request: weather → AI → save…
      </p>
    </div>
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
        <ResultsHeader log={log} scoreClass={scoreClass} />
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

function ResultsHeader({
  log,
  scoreClass,
}: {
  log: PlantLogRow;
  scoreClass: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-white">{log.plant_name}</h3>
        <p className="mt-0.5 text-xs text-botanical-muted">
          ID {log.id.slice(0, 8)}…
        </p>
      </div>
      <ScoreBadge score={log.health_score} scoreClass={scoreClass} />
    </div>
  );
}

function ScoreBadge({
  score,
  scoreClass,
}: {
  score: number;
  scoreClass: string;
}) {
  return (
    <div className="text-right">
      <p className="text-xs text-botanical-muted">Score</p>
      <p className={`text-3xl font-bold tabular-nums ${scoreClass}`}>{score}</p>
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
      "[PlantDashboard] Non-JSON analyze response:",
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
    console.error("[PlantDashboard] Analyze API error:", response.status, message);
    return { ok: false, error: message };
  }

  const successPayload = payload as AnalyzePlantResponse;
  if (
    typeof successPayload !== "object" ||
    successPayload === null ||
    !successPayload.log ||
    typeof successPayload.log.id !== "string"
  ) {
    return {
      ok: false,
      error: "Server returned an unexpected response shape.",
    };
  }

  return { ok: true, data: successPayload };
}

async function fetchPlantLogs(): Promise<
  | { ok: true; logs: PlantLogRow[] }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/plants", { cache: "no-store" });
  const rawText = await response.text();

  if (!rawText.trim()) {
    return { ok: false, error: "Could not load plant history (empty response)." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch {
    return { ok: false, error: "Could not load plant history (invalid JSON)." };
  }

  if (!response.ok) {
    const err = payload as AnalyzePlantErrorResponse;
    return {
      ok: false,
      error: err.error ?? `Could not load plant history (HTTP ${response.status}).`,
    };
  }

  const data = payload as PlantLogsListResponse;
  if (!Array.isArray(data.logs)) {
    return { ok: false, error: "Unexpected plant history response." };
  }

  return { ok: true, logs: data.logs };
}

export default function PlantDashboard() {
  const [plantName, setPlantName] = useState("");
  const [species, setSpecies] = useState("");
  const [city, setCity] = useState("");
  const [imageSelection, setImageSelection] = useState<PlantImageSelection | null>(
    null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [result, setResult] = useState<PlantLogRow | null>(null);
  const [plantLogs, setPlantLogs] = useState<PlantLogRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const analyzeInFlightRef = useRef(false);
  const historyLoadedRef = useRef(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    const loaded = await fetchPlantLogs();
    if (loaded.ok) {
      setPlantLogs(loaded.logs);
    } else {
      setHistoryError(loaded.error);
      console.error("[PlantDashboard] History load failed:", loaded.error);
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    if (historyLoadedRef.current) {
      return;
    }
    historyLoadedRef.current = true;
    void loadHistory();
  }, [loadHistory]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (analyzeInFlightRef.current || isAnalyzing) {
      return;
    }

    analyzeInFlightRef.current = true;
    setAnalyzeError(null);
    setIsAnalyzing(true);

    try {
      const body: Record<string, string | undefined> = {
        plantName: plantName.trim(),
        species: species.trim() || undefined,
        city: city.trim(),
      };

      if (imageSelection) {
        body.plantImageBase64 = imageSelection.base64;
        body.plantImageMimeType = imageSelection.mimeType;
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const parsed = await parseAnalyzeResponse(response);

      if (!parsed.ok) {
        setAnalyzeError(parsed.error);
        return;
      }

      const newLog = parsed.data.log;
      setResult(newLog);
      setPlantLogs((previous) => {
        const withoutDuplicate = previous.filter((row) => row.id !== newLog.id);
        return [newLog, ...withoutDuplicate];
      });
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Network error — could not reach the analysis service.";
      console.error("[PlantDashboard] Submit failed:", message);
      setAnalyzeError(message);
    } finally {
      setIsAnalyzing(false);
      analyzeInFlightRef.current = false;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel">
          <h2 className="mb-1 text-lg font-medium text-white">Plant Ingestion</h2>
          <p className="mb-6 text-sm text-botanical-muted">
            One submit = one weather fetch, one AI call, one database save.
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
              disabled={isAnalyzing}
              required
            />
            <FormField
              id="species"
              label="Species"
              name="species"
              placeholder="e.g. Monstera deliciosa"
              value={species}
              onChange={setSpecies}
              disabled={isAnalyzing}
            />
            <FormField
              id="city"
              label="City (weather context)"
              name="city"
              placeholder="e.g. London"
              value={city}
              onChange={setCity}
              disabled={isAnalyzing}
              required
            />

            <ImageDropzone
              selection={imageSelection}
              onSelectionChange={setImageSelection}
              disabled={isAnalyzing}
            />

            {analyzeError ? (
              <p
                role="alert"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {analyzeError}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "Analyzing…" : "Analyze plant health"}
            </button>
          </form>
        </section>

        <section className="panel flex flex-col">
          <h2 className="mb-1 text-lg font-medium text-white">Health Report</h2>
          <p className="mb-6 text-sm text-botanical-muted">
            Latest analysis or a plant selected from history.
          </p>

          {isAnalyzing ? (
            <LoadingState />
          ) : result ? (
            <ResultsContent log={result} />
          ) : (
            <EmptyState />
          )}
        </section>
      </div>

      <PlantHistoryList
        logs={plantLogs}
        selectedId={result?.id ?? null}
        isLoading={historyLoading}
        error={historyError}
        onSelect={(log) => {
          setResult(log);
          setAnalyzeError(null);
        }}
      />
    </div>
  );
}
