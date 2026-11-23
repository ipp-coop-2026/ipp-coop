import { useQuery } from "@tanstack/react-query";
import { DEMO_DATA, latestProfile, loadMatchData, withAiSignals, type AiSignalData, type LiveSource, type MatchData, type Profile } from "@/lib/p05";

export type SourceState =
  | { mode: "loading" }
  | LiveSource
  | { mode: "demo"; reason: string };

const EMPTY_AI: AiSignalData = { model: "Supabase/gte-small", source: "live", goals: {}, phrases: {} };

/**
 * Shared database first (read-only); the demo slice if it cannot be reached. While the database loads,
 * nothing pretends to be live data.
 */
export function useMatchData(): { data: MatchData | null; source: SourceState } {
  const q = useQuery({ queryKey: ["p05", "match-data"], queryFn: () => loadMatchData(), staleTime: 5 * 60_000, retry: 1, retryDelay: 500 });
  if (q.isPending) return { data: null, source: { mode: "loading" } };
  if (q.isError || !q.data) {
    return { data: DEMO_DATA, source: { mode: "demo", reason: q.error instanceof Error ? q.error.message : "No data" } };
  }
  return { data: q.data.data, source: q.data.source };
}

/** AI signals for the selected student: stored embeddings, or scored live for text written after the seed. */
export function useAiSignals(data: MatchData | null, live: boolean, studentId: string, enabled: boolean): { ai: AiSignalData | null; loading: boolean } {
  const profile: Profile | null = data ? latestProfile(data, studentId) : null;
  const q = useQuery({
    queryKey: ["p05", "ai", studentId, profile?.profile_version ?? 0],
    queryFn: () => withAiSignals(EMPTY_AI, profile as Profile),
    enabled: enabled && live && profile !== null,
    staleTime: 30 * 60_000,
    retry: 0,
  });
  if (!live) return { ai: data?.ai ?? null, loading: false };
  if (!enabled) return { ai: null, loading: false };
  if (q.isPending) return { ai: null, loading: true };
  return { ai: q.data ?? EMPTY_AI, loading: false };
}
