"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface PaywallOpenContextValue {
  isPaywallOpen: boolean;
  setPaywallOpen: (open: boolean) => void;
}

const PaywallOpenContext = createContext<PaywallOpenContextValue | null>(null);

export function PaywallOpenProvider({ children }: { children: ReactNode }) {
  const openCountRef = useRef(0);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const setPaywallOpen = useCallback((open: boolean) => {
    if (open) {
      openCountRef.current += 1;
    } else {
      openCountRef.current = Math.max(0, openCountRef.current - 1);
    }
    setIsPaywallOpen(openCountRef.current > 0);
  }, []);

  return (
    <PaywallOpenContext.Provider value={{ isPaywallOpen, setPaywallOpen }}>
      {children}
    </PaywallOpenContext.Provider>
  );
}

export function usePaywallOpen() {
  const ctx = useContext(PaywallOpenContext);
  if (!ctx) {
    return {
      isPaywallOpen: false,
      setPaywallOpen: () => {},
    };
  }
  return ctx;
}

/** Sync a local paywall open state with the shared context. */
export function useSyncPaywallOpen(open: boolean) {
  const { setPaywallOpen } = usePaywallOpen();

  useEffect(() => {
    if (!open) return;
    setPaywallOpen(true);
    return () => setPaywallOpen(false);
  }, [open, setPaywallOpen]);
}
