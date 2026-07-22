"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PendingRemoval = {
  id: string;
  label: string;
  commit: () => Promise<void>;
};

const UNDO_WINDOW_MS = 10_000;

export function useUndoableRemoval() {
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const timer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const undoRemoval = useCallback(() => {
    clearTimer();
    setPendingRemoval(null);
  }, [clearTimer]);

  const stageRemoval = useCallback((id: string, label: string, commit: () => Promise<void>) => {
    clearTimer();
    setPendingRemoval({ id, label, commit });
  }, [clearTimer]);

  useEffect(() => {
    if (!pendingRemoval) return;
    timer.current = window.setTimeout(() => {
      const current = pendingRemoval;
      setPendingRemoval(null);
      void current.commit();
    }, UNDO_WINDOW_MS);
    return clearTimer;
  }, [clearTimer, pendingRemoval]);

  return {
    pendingRemoval,
    stageRemoval,
    undoRemoval,
    isPendingRemoval: (id: string) => pendingRemoval?.id === id,
  };
}
