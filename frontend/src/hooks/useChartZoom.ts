'use client';

import { useState, useCallback } from 'react';

interface ZoomState {
  left: 'dataMin' | number;
  right: 'dataMax' | number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RechartMouseEvent = any;

export function useChartZoom() {
  const [zoomState, setZoomState] = useState<ZoomState>({
    left: 'dataMin',
    right: 'dataMax',
  });
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);

  const onMouseDown = useCallback((e: RechartMouseEvent) => {
    if (e && e.activeLabel != null) {
      setRefAreaLeft(Number(e.activeLabel));
      setRefAreaRight(null);
    }
  }, []);

  const onMouseMove = useCallback(
    (e: RechartMouseEvent) => {
      if (refAreaLeft != null && e && e.activeLabel != null) {
        setRefAreaRight(Number(e.activeLabel));
      }
    },
    [refAreaLeft]
  );

  const onMouseUp = useCallback(() => {
    if (refAreaLeft == null || refAreaRight == null) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    const left = Math.min(refAreaLeft, refAreaRight);
    const right = Math.max(refAreaLeft, refAreaRight);

    // If selection is too small (< 5% of range), treat as click not drag
    const range = right - left;
    const fullRange =
      typeof zoomState.right === 'number' && typeof zoomState.left === 'number'
        ? zoomState.right - zoomState.left
        : range * 20; // fallback estimate

    if (range / fullRange < 0.05) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    setZoomState({ left, right });
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [refAreaLeft, refAreaRight, zoomState]);

  const onDoubleClickReset = useCallback(() => {
    setZoomState({ left: 'dataMin', right: 'dataMax' });
  }, []);

  return {
    zoomState,
    refAreaLeft,
    refAreaRight,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onDoubleClickReset,
  };
}
