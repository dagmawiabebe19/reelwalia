export type DropOffMetricSource = "events" | "watch_history" | "combined" | "untracked";

type EventRow = {
  user_id?: string | null;
  visitor_id?: string | null;
  episode_id?: string | null;
  event_type: string;
};

type HistoryRow = {
  user_id: string;
  episode_id: string;
  completed: boolean;
};

export function analyticsActorId(row: {
  user_id?: string | null;
  visitor_id?: string | null;
}): string | null {
  if (row.user_id) return `u:${row.user_id}`;
  if (row.visitor_id) return `v:${row.visitor_id}`;
  return null;
}

export type EpisodeDropOffComputed = {
  started: number | null;
  finished: number | null;
  completionRate: number | null;
  source: DropOffMetricSource;
};

export function computeEpisodeDropOff(params: {
  episodeId: string;
  startEvents: EventRow[];
  completeEvents: EventRow[];
  history: HistoryRow[];
  canTrackCompletions: boolean;
}): EpisodeDropOffComputed {
  const { episodeId, startEvents, completeEvents, history, canTrackCompletions } = params;

  const startedActors = new Set<string>();
  const finishedActors = new Set<string>();

  for (const row of startEvents) {
    if (row.episode_id !== episodeId) continue;
    const id = analyticsActorId(row);
    if (id) startedActors.add(id);
  }

  for (const row of history) {
    if (row.episode_id !== episodeId) continue;
    startedActors.add(`u:${row.user_id}`);
    if (row.completed) finishedActors.add(`u:${row.user_id}`);
  }

  for (const row of completeEvents) {
    if (row.episode_id !== episodeId) continue;
    const id = analyticsActorId(row);
    if (!id) continue;
    finishedActors.add(id);
    startedActors.add(id);
  }

  const hasStartData = startedActors.size > 0;
  if (!hasStartData) {
    return {
      started: null,
      finished: null,
      completionRate: null,
      source: "untracked",
    };
  }

  const started = startedActors.size;
  if (!canTrackCompletions) {
    return {
      started,
      finished: null,
      completionRate: null,
      source: "watch_history",
    };
  }

  const finished = finishedActors.size;
  const hasEventCompletes = completeEvents.some(
    (row) => row.episode_id === episodeId && row.event_type === "complete"
  );
  const hasHistoryCompletes = history.some(
    (row) => row.episode_id === episodeId && row.completed
  );
  const source: DropOffMetricSource =
    hasEventCompletes && hasHistoryCompletes
      ? "combined"
      : hasEventCompletes
        ? "events"
        : "watch_history";

  return {
    started,
    finished,
    completionRate: started > 0 ? (finished / started) * 100 : null,
    source,
  };
}

/** Completions recorded in watch_history but absent from episode_events (signed-in only). */
export function countHistoryCompletionsRecovered(params: {
  history: HistoryRow[];
  completeEvents: EventRow[];
}): number {
  const eventCompleteUsers = new Set<string>();
  for (const row of params.completeEvents) {
    if (row.event_type !== "complete" || !row.user_id || !row.episode_id) continue;
    eventCompleteUsers.add(`${row.user_id}:${row.episode_id}`);
  }

  let recovered = 0;
  for (const row of params.history) {
    if (!row.completed) continue;
    const key = `${row.user_id}:${row.episode_id}`;
    if (!eventCompleteUsers.has(key)) recovered += 1;
  }
  return recovered;
}
