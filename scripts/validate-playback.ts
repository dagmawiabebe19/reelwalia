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
  PAYWALL_VARIANT_AFTER_3,
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
  splitUsdParts,
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
assert(freeEpisodeCountForVariant(PAYWALL_VARIANT_AFTER_3) === 3, "Group C: 3 free episodes");
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
assert(
  isEpisodeFree(3, resolveViewerFreeEpisodeCount(2, PAYWALL_VARIANT_AFTER_3)) === true,
  "Group C unlocks episode 3"
);
assert(
  isEpisodeFree(4, resolveViewerFreeEpisodeCount(2, PAYWALL_VARIANT_AFTER_3)) === false,
  "Group C locks episode 4"
);

const cookie = serializePaywallAbCookie({
  visitorId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  variant: PAYWALL_VARIANT_AFTER_1,
});
assert(parsePaywallAbCookie(cookie)?.variant === PAYWALL_VARIANT_AFTER_1, "Cookie round-trip");
assert(parsePaywallAbCookie("tampered") === null, "Reject bad cookie");

let seenA = false;
let seenB = false;
let seenC = false;
for (let i = 0; i < 40; i++) {
  const picked = pickPaywallVariant(i / 40);
  if (picked === PAYWALL_VARIANT_AFTER_1) seenA = true;
  if (picked === PAYWALL_VARIANT_AFTER_2) seenB = true;
  if (picked === PAYWALL_VARIANT_AFTER_3) seenC = true;
}
assert(seenA && seenB && seenC, "Three-way picker can emit all groups");

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
assert(week.label === "1-WEEK", "1-week label");
assert(twoWeek.label === "2-WEEK", "2-week label");
assert(month.label === "1-MONTH", "1-month label");
assert(twoWeek.amountCents === 175, "2-week is 175 cents");
assert(month.amountCents === 400, "1-month is 400 cents");
assert(week.amount === week.amountCents / 100, "display amount derived from cents");
assert(twoWeek.amount === twoWeek.amountCents / 100, "2-week display derived from cents");
assert(month.amount === month.amountCents / 100, "1-month display derived from cents");
assert(week.priceEnvKey === "STRIPE_PRICE_1WEEK_INTRO", "1-week checkout env key");
assert(twoWeek.priceEnvKey === "STRIPE_PRICE_2WEEK_INTRO", "2-week checkout env key");
assert(month.priceEnvKey === "STRIPE_PRICE_1MONTH_INTRO", "1-month checkout env key");
assert(splitUsdParts(week.amount).dollars === "1", "1-week dollars dominate as 1");
assert(splitUsdParts(week.amount).cents === "00", "1-week cents are 00");
assert(splitUsdParts(twoWeek.amount).dollars === "1", "2-week dollars are 1");
assert(splitUsdParts(twoWeek.amount).cents === "75", "2-week cents are 75");
assert(splitUsdParts(month.amount).dollars === "4", "1-month dollars dominate as 4");
assert(splitUsdParts(month.amount).cents === "00", "1-month cents are 00");
assert(formatDailyPrice(twoWeek) === "$0.13/day", "2-week per-day is $0.13");
assert(formatDailyPrice(month) === "$0.13/day", "1-month per-day is $0.13");
assert(savingsBadge(week) === null, "weekly plan has no savings badge");
assert(
  dailySavingsPercentVsWeekly(twoWeek) === null,
  "2-week ~7% savings is too small to badge"
);
assert(savingsBadge(twoWeek) === null, "2-week has no savings badge");
assert(
  dailySavingsPercentVsWeekly(month) === null,
  "1-month ~7% savings is too small to badge"
);
assert(savingsBadge(month) === null, "1-month has no savings badge");
assert(month.mostPopular === true, "1-month is Most Popular");
assert(!twoWeek.mostPopular, "2-week is not Most Popular");

console.log("✓ All playback validation checks passed");
console.log("  Entry: /watch/{id}?autoplay=true");
console.log("  Chain: ep1–ep2 free → [paywall] → ep3+ (Group B / unassigned default)");
console.log("  A/B: Group A wall after ep1; Group B after ep2; Group C after ep3");
console.log(`  Free tier: episodes 1–${DEFAULT_FREE_EPISODE_COUNT}`);
console.log("  Binge progress: always starts at 0");
