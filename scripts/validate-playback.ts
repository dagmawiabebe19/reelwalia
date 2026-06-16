/**
 * Launch validation — playback routing, binge chain, and paywall gating logic.
 * Run: npx tsx scripts/validate-playback.ts
 */
import {
  canWatchEpisode,
  DEFAULT_FREE_EPISODE_COUNT,
  isEpisodeFree,
  resolveFreeEpisodeCount,
} from "../lib/access";
import { getNextEpisode, getEpisodeByNumber } from "../lib/episodes";
import {
  resolveInitialProgress,
  type WatchHistoryProgress,
} from "../lib/watch-progress";
import {
  markBingeContinuation,
  markWatchNavigation,
  watchEpisodeHref,
  WATCH_USER_INITIATED_KEY,
  AUDIO_UNMUTED_KEY,
} from "../lib/watch-playback";

const episodes = [
  { id: "ep6", episode_number: 6, title: "Episode 6" },
  { id: "ep1", episode_number: 1, title: "Episode 1" },
  { id: "ep3", episode_number: 3, title: "Episode 3" },
  { id: "ep2", episode_number: 2, title: "Episode 2" },
  { id: "ep4", episode_number: 4, title: "Episode 4" },
  { id: "ep5", episode_number: 5, title: "Episode 5" },
];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// --- Entry point hrefs ---
assert(
  watchEpisodeHref("ep1") === "/watch/ep1?autoplay=true",
  "WatchEpisodeLink must append autoplay=true"
);

// --- Binge chain Ep1 → Ep6 ---
let currentId = "ep1";
const chain: string[] = [currentId];
for (let i = 0; i < 5; i++) {
  const next = getNextEpisode(episodes, currentId);
  assert(next !== null, `Expected next after ${currentId}`);
  currentId = next!.id;
  chain.push(currentId);
}
assert(
  chain.join(",") === "ep1,ep2,ep3,ep4,ep5,ep6",
  `Binge chain failed: ${chain.join(" → ")}`
);
assert(getNextEpisode(episodes, "ep6") === null, "Ep6 should have no next");

// --- Episode by number ---
assert(getEpisodeByNumber(episodes, 1)?.id === "ep1", "getEpisodeByNumber(1)");
assert(getEpisodeByNumber(episodes, 3)?.id === "ep3", "getEpisodeByNumber(3)");

// --- Paywall gating (REDBIRD: 1 free episode) ---
const freeCount = resolveFreeEpisodeCount(1);
assert(freeCount === 1, "resolveFreeEpisodeCount uses series value");
assert(
  resolveFreeEpisodeCount(undefined) === DEFAULT_FREE_EPISODE_COUNT,
  "Default free episode count is 1"
);
assert(isEpisodeFree(1, freeCount), "Episode 1 is free");
assert(!isEpisodeFree(2, freeCount), "Episode 2 is locked");
assert(!isEpisodeFree(4, freeCount), "Episode 4 is locked");
assert(
  canWatchEpisode(4, freeCount, { subscription_status: "active" }),
  "Subscribers can watch episode 4"
);
assert(
  !canWatchEpisode(4, freeCount, { subscription_status: "none" }),
  "Guests cannot watch episode 4"
);
assert(
  !canWatchEpisode(4, freeCount, null),
  "Logged-out users cannot watch episode 4"
);

// Binge chain stops at paywall boundary — ep1 next is ep2 (locked for guests)
const ep1Next = getNextEpisode(episodes, "ep1");
assert(ep1Next?.id === "ep2", "After ep1 binge targets ep2");
assert(
  !canWatchEpisode(ep1Next!.episode_number, freeCount, null),
  "Ep2 requires subscription after free tier"
);

// --- Progress resolution (root-cause fix) ---
const nearComplete: WatchHistoryProgress = { progress_seconds: 420, completed: false };
assert(
  resolveInitialProgress(nearComplete, true) === 0,
  "Binge nav must ignore saved progress"
);
assert(
  resolveInitialProgress(nearComplete, false) === 420,
  "Manual visit should resume"
);
assert(
  resolveInitialProgress({ progress_seconds: 100, completed: true }, false) === 0,
  "Completed episodes restart at 0"
);
assert(resolveInitialProgress(null, false) === 0, "No history starts at 0");

// --- Session storage binge continuation (in-memory mock) ---
const storage = new Map<string, string>();
const mockSession = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => {
    storage.set(k, v);
  },
  removeItem: (k: string) => {
    storage.delete(k);
  },
};
(globalThis as unknown as { sessionStorage: typeof mockSession }).sessionStorage =
  mockSession;

markWatchNavigation();
assert(storage.has(WATCH_USER_INITIATED_KEY), "markWatchNavigation sets flag");
storage.clear();
markBingeContinuation();
assert(storage.has(WATCH_USER_INITIATED_KEY), "markBingeContinuation sets flag");

console.log("✓ All playback validation checks passed");
console.log("  Entry: /watch/{id}?autoplay=true");
console.log("  Chain: ep1 → [paywall] → ep2+");
console.log(`  Free tier: episodes 1–${DEFAULT_FREE_EPISODE_COUNT}`);
console.log("  Binge progress: always starts at 0");
