import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createBudgetActionHints, selectBudgetViewModel } from "./selectors";
import type {
  BudgetApiClient,
  BudgetController,
  BudgetLoadState,
  DailyBudgetRecalculateRequest,
  DailyBudgetSnapshot,
} from "./types";
import { redactBudgetError } from "./utils";

export type UseDailyBudgetOptions = Readonly<{
  autoLoad?: boolean;
  initialSnapshot?: DailyBudgetSnapshot | null;
}>;

function initialLoadState(
  snapshot: DailyBudgetSnapshot | null,
): BudgetLoadState {
  return snapshot
    ? { status: "ready", snapshot, error: null }
    : { status: "loading", snapshot: null, error: null };
}

export function useDailyBudget(
  api: BudgetApiClient,
  options: UseDailyBudgetOptions = {},
): BudgetController {
  const autoLoad = options.autoLoad ?? true;
  const [state, setState] = useState<BudgetLoadState>(() =>
    initialLoadState(options.initialSnapshot ?? null),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const mountedRef = useRef(true);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const recalculatePromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback((): Promise<void> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const task = (async (): Promise<void> => {
      setRefreshing(true);
      try {
        const response = await api.getToday();
        if (!mountedRef.current) return;
        setState(
          response
            ? { status: "ready", snapshot: response.data.snapshot, error: null }
            : { status: "empty", snapshot: null, error: null },
        );
      } catch (error) {
        if (!mountedRef.current) return;
        const message = redactBudgetError(error);
        setState((current) =>
          current.snapshot
            ? { status: "stale", snapshot: current.snapshot, error: message }
            : { status: "error", snapshot: null, error: message },
        );
      } finally {
        if (mountedRef.current) setRefreshing(false);
        refreshPromiseRef.current = null;
      }
    })();
    refreshPromiseRef.current = task;
    return task;
  }, [api]);

  const recalculate = useCallback(
    (request: DailyBudgetRecalculateRequest): Promise<void> => {
      if (recalculatePromiseRef.current) return recalculatePromiseRef.current;

      const task = (async (): Promise<void> => {
        setRecalculating(true);
        try {
          await api.recalculate(request);
          await refresh();
        } finally {
          if (mountedRef.current) setRecalculating(false);
          recalculatePromiseRef.current = null;
        }
      })();
      recalculatePromiseRef.current = task;
      return task;
    },
    [api, refresh],
  );

  const recordChecked = useCallback(async (): Promise<void> => {
    await api.recordChecked();
  }, [api]);

  useEffect(() => {
    if (autoLoad) void refresh();
  }, [autoLoad, refresh]);

  const viewModel = useMemo(
    () => (state.snapshot ? selectBudgetViewModel(state.snapshot) : null),
    [state.snapshot],
  );
  const hints = useMemo(
    () => (state.snapshot ? createBudgetActionHints(state.snapshot) : []),
    [state.snapshot],
  );

  return {
    state,
    viewModel,
    hints,
    refreshing,
    recalculating,
    refresh,
    recalculate,
    recordChecked,
  };
}
