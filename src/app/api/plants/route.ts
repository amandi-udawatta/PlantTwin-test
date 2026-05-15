import { NextResponse } from "next/server";
import {
  getRecentPlantLogs,
  SupabaseServiceError,
} from "@/services/supabaseService";
import type { PlantLogsListResponse } from "@/types/analyze";
import type { AnalyzePlantErrorResponse } from "@/types/analyze";

export const runtime = "nodejs";

export async function GET(): Promise<
  NextResponse<PlantLogsListResponse | AnalyzePlantErrorResponse>
> {
  try {
    const logs = await getRecentPlantLogs(50);
    return NextResponse.json({ logs } satisfies PlantLogsListResponse);
  } catch (error) {
    if (error instanceof SupabaseServiceError) {
      return NextResponse.json({ error: error.userMessage }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Could not load plant history." },
      { status: 500 },
    );
  }
}
