"use client";

import type { PlantLogRow } from "@/types/plantLog";

function getHealthScoreClass(score: number): string {
  if (score >= 70) {
    return "text-botanical-accent";
  }
  if (score >= 40) {
    return "text-botanical-warn";
  }
  return "text-red-400";
}

interface PlantHistoryListProps {
  logs: PlantLogRow[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (log: PlantLogRow) => void;
}

export default function PlantHistoryList({
  logs,
  selectedId,
  isLoading,
  error,
  onSelect,
}: PlantHistoryListProps) {
  return (
    <section className="panel">
      <h2 className="mb-1 text-lg font-medium text-white">Saved Plants</h2>
      <p className="mb-4 text-sm text-botanical-muted">
        Tap a record to view its full health report.
      </p>

      {isLoading ? (
        <p className="text-sm text-botanical-muted">Loading plant history…</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-botanical-border px-4 py-8 text-center text-sm text-botanical-muted">
          No plants saved yet. Run an analysis to add your first log.
        </p>
      ) : null}

      <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {logs.map((log) => {
          const isSelected = log.id === selectedId;
          const scoreClass = getHealthScoreClass(log.health_score);
          return (
            <li key={log.id}>
              <button
                type="button"
                onClick={() => onSelect(log)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-botanical-accent bg-botanical-accent/10"
                    : "border-botanical-border bg-botanical-bg/50 hover:border-botanical-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{log.plant_name}</p>
                    {log.species ? (
                      <p className="text-xs text-botanical-muted">{log.species}</p>
                    ) : null}
                  </div>
                  <span className={`text-lg font-bold tabular-nums ${scoreClass}`}>
                    {log.health_score}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-botanical-muted">
                  {log.summary}
                </p>
                <p className="mt-2 text-[10px] text-botanical-muted/80">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
