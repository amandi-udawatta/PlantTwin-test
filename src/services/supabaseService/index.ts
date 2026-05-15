import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PlantLogInsert, PlantLogRow } from "@/types/plantLog";

export class SupabaseServiceError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string = "Database is currently unavailable.",
  ) {
    super(message);
    this.name = "SupabaseServiceError";
  }
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new SupabaseServiceError(
      "NEXT_PUBLIC_SUPABASE_URL is not configured",
      "Database is not configured.",
    );
  }
  return url;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new SupabaseServiceError(
      "SUPABASE_SERVICE_ROLE_KEY is not configured",
      "Database write access is not configured.",
    );
  }
  return key;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new SupabaseServiceError(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured",
      "Database is not configured.",
    );
  }
  return key;
}

let adminClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

export function createSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl(), getServiceRoleKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}

export function createSupabaseClient(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(getSupabaseUrl(), getAnonKey());
  }
  return publicClient;
}

function isPlantLogRow(value: unknown): value is PlantLogRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.plant_name === "string" &&
    (typeof record.species === "string" || record.species === null) &&
    typeof record.health_score === "number" &&
    typeof record.summary === "string" &&
    Array.isArray(record.recommendations) &&
    record.recommendations.every((item) => typeof item === "string") &&
    typeof record.weather_context === "string" &&
    typeof record.created_at === "string"
  );
}

export async function insertPlantLog(
  log: PlantLogInsert,
): Promise<PlantLogRow> {
  const client = createSupabaseAdminClient();

  const { data, error } = await client
    .from("plant_logs")
    .insert(log)
    .select()
    .single();

  if (error) {
    throw new SupabaseServiceError(
      `Failed to insert plant log: ${error.message}`,
      "Could not save the analysis. Please try again.",
    );
  }

  if (!isPlantLogRow(data)) {
    throw new SupabaseServiceError(
      "Insert succeeded but returned unexpected row shape",
      "Could not save the analysis. Please try again.",
    );
  }

  return data;
}

export async function getRecentPlantLogs(limit = 10): Promise<PlantLogRow[]> {
  const client = createSupabaseClient();

  const { data, error } = await client
    .from("plant_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new SupabaseServiceError(
      `Failed to fetch plant logs: ${error.message}`,
      "Could not load recent analyses.",
    );
  }

  if (!Array.isArray(data)) {
    throw new SupabaseServiceError(
      "Fetch returned unexpected data shape",
      "Could not load recent analyses.",
    );
  }

  const rows: PlantLogRow[] = [];
  for (const item of data) {
    if (!isPlantLogRow(item)) {
      throw new SupabaseServiceError(
        "One or more plant log rows had an unexpected shape",
        "Could not load recent analyses.",
      );
    }
    rows.push(item);
  }

  return rows;
}
