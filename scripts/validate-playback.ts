/**
 * Launch validation — playback routing, binge chain, and paywall gating logic.
 * Run: npx tsx scripts/validate-playback.ts
 */
import {
  canWatchEpisode,
  DEFAULT_FREE_EPISODE_COUNT,
  isEpisodeFree,
  resolveFreeEpisodeCount,
  resolveViewerFreeEpisodeCount,
} from "../lib/access";
import {
  analyticsActorId,
  computeEpisodeDropOff,
  countHistoryCompletionsRecovered,
} from "../lib/admin/analytics-dropoff";
import {
  EPISODE_COMPLETE_THRESHOLD,
  isEpisodeWatchComplete,
  resolvePlaybackDuration,
} from "../lib/analytics/episode-complete";
import {
  PAYWALL_VARIANT_AFTER_1,
  PAYWALL_VARIANT_AFTER_2,
  freeEpisodeCountForVariant,
  parsePaywallAbCookie,
  pickPaywallVariant,
  serializePaywallAbCookie,
} from "../lib/paywall-ab";
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
import {
  dailySavingsPercentVsWeekly,
  formatDailyPrice,
  getPlanDisplay,
  savingsBadge,
} from "../lib/stripe/plans";

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

// --- Paywall gating (2 free episodes by default; series can override) ---
const freeCount = resolveFreeEpisodeCount(2);
assert(freeCount === 2, "resolveFreeEpisodeCount uses series value");
assert(
  resolveFreeEpisodeCount(undefined) === DEFAULT_FREE_EPISODE_COUNT,
  "Default free episode count is 2"
);
assert(DEFAULT_FREE_EPISODE_COUNT === 2, "Product default is episodes 1–2 free");
assert(isEpisodeFree(1, freeCount), "Episode 1 is free");
assert(isEpisodeFree(2, freeCount), "Episode 2 is free");
assert(!isEpisodeFree(3, freeCount), "Episode 3 is locked");
assert(
  canWatchEpisode(3, freeCount, { subscription_status: "active" }),
  "Subscribers can watch episode 3"
);
assert(
  !canWatchEpisode(3, freeCount, { subscription_status: "none" }),
  "Guests cannot watch episode 3"
);
assert(
  !canWatchEpisode(3, freeCount, null),
  "Logged-out users cannot watch episode 3"
);

// Binge chain stops at paywall boundary — ep2 next is ep3 (locked for guests)
const ep2Next = getNextEpisode(episodes, "ep2");
assert(ep2Next?.id === "ep3", "After ep2 binge targets ep3");
assert(
  !canWatchEpisode(ep2Next!.episode_number, freeCount, null),
  "Ep3 requires subscription after free tier"
);

// Series override still respected when free_episode_count is higher (unassigned viewers)
assert(isEpisodeFree(5, resolveFreeEpisodeCount(5)), "Series can keep a wider free window");

// --- Paywall A/B variants ---
assert(freeEpisodeCountForVariant(PAYWALL_VARIANT_AFTER_1) === 1, "Group A: 1 free episode");
assert(freeEpisodeCountForVariant(PAYWALL_VARIANT_AFTER_2) === 2, "Group B: 2 free episodes");
assert(
  resolveViewerFreeEpisodeCount(5, PAYWALL_VARIANT_AFTER_1) === 1,
  "Assigned variant overrides series free count"
);
assert(
  resolveViewerFreeEpisodeCount(5, null) === 5,
  "Unassigned viewers keep series free count"
);
assert(
  isEpisodeFree(2, resolveViewerFreeEpisodeCount(2, PAYWALL_VARIANT_AFTER_1)) === false,
  "Group A locks episode 2"
);
assert(
  isEpisodeFree(2, resolveViewerFreeEpisodeCount(2, PAYWALL_VARIANT_AFTER_2)) === true,
  "Group B unlocks episode 2"
);
assert(
  isEpisodeFree(3, resolveViewerFreeEpisodeCount(2, PAYWALL_VARIANT_AFTER_2)) === false,
  "Group B locks episode 3"
);

const cookie = serializePaywallAbCookie({
  visitorId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  variant: PAYWALL_VARIANT_AFTER_1,
});
assert(parsePaywallAbCookie(cookie)?.variant === PAYWALL_VARIANT_AFTER_1, "Cookie round-trip");
assert(parsePaywallAbCookie("tampered") === null, "Reject bad cookie");

let seenA = false;
let seenB = false;
for (let i = 0; i < 40; i++) {
  const picked = pickPaywallVariant(i / 40);
  if (picked === PAYWALL_VARIANT_AFTER_1) seenA = true;
  if (picked === PAYWALL_VARIANT_AFTER_2) seenB = true;
}
assert(seenA && seenB, "50/50 picker can emit both groups");

// --- Episode completion threshold ---
assert(EPISODE_COMPLETE_THRESHOLD === 0.9, "Complete at 90% of duration");
assert(isEpisodeWatchComplete(54, 60), "54/60s counts as complete");
assert(!isEpisodeWatchComplete(53, 60), "53/60s is not complete");
assert(resolvePlaybackDuration(NaN, 60) === 60, "Fall back to state duration when live is NaN");

const dropOff = computeEpisodeDropOff({
  episodeId: "ep1",
  startEvents: [
    { episode_id: "ep1", event_type: "start", user_id: "u1" },
    { episode_id: "ep1", event_type: "start", user_id: "u1" },
    { episode_id: "ep1", event_type: "start", visitor_id: "v1" },
  ],
  completeEvents: [],
  history: [{ user_id: "u2", episode_id: "ep1", completed: true }],
  canTrackCompletions: true,
});
assert(dropOff.started === 3, "Distinct starts: u1 + v1 + u2 from history");
assert(dropOff.finished === 1, "History completion for u2");
assert(
  countHistoryCompletionsRecovered({
    history: [{ user_id: "u2", episode_id: "ep1", completed: true }],
    completeEvents: [],
  }) === 1,
  "Recovered count from watch_history"
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

const week = getPlanDisplay("1week");
const twoWeek = getPlanDisplay("2week");
const month = getPlanDisplay("1month");
assert(formatDailyPrice(week) === "$0.57/day", "1-week per-day is $0.57");
assert(formatDailyPrice(twoWeek) === "$0.30/day", "2-week per-day is $0.30");
assert(formatDailyPrice(month) === "$0.25/day", "1-month per-day is $0.25");
assert(savingsBadge(week) === null, "weekly plan has no savings badge");
assert(
  dailySavingsPercentVsWeekly(twoWeek) === 47,
  "2-week is 47% less per day than weekly"
);
assert(
  savingsBadge(twoWeek) === "47% less per day than weekly",
  "2-week badge names the per-day basis"
);
assert(
  dailySavingsPercentVsWeekly(month) === 56,
  "1-month is 56% less per day than weekly"
);
assert(
  savingsBadge(month) === "56% less per day than weekly",
  "1-month badge names the per-day basis"
);

console.log("✓ All playback validation checks passed");
console.log("  Entry: /watch/{id}?autoplay=true");
console.log("  Chain: ep1–ep2 free → [paywall] → ep3+ (Group B / unassigned default)");
console.log("  A/B: Group A wall after ep1; Group B wall after ep2");
console.log(`  Free tier: episodes 1–${DEFAULT_FREE_EPISODE_COUNT}`);
console.log("  Binge progress: always starts at 0");
