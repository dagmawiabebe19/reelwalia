"use client";

import { useState } from "react";

interface WatchlistButtonProps {
  seriesId: string;
  initialInWatchlist?: boolean;
}

export function WatchlistButton({
  seriesId,
  initialInWatchlist = false,
}: WatchlistButtonProps) {
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/watchlist/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId }),
      });
      if (res.status === 401) {
        window.location.href = "/auth/sign-in";
        return;
      }
      const data = (await res.json()) as { added?: boolean };
      if (res.ok) setInWatchlist(!!data.added);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void toggle()}
      className="rw-btn-secondary"
    >
      {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
    </button>
  );
}
