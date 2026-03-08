import { useCallback, useRef } from "react";
import type { TouchEventHandler } from "react";

type UseHorizontalSwipeOptions = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  minDistance?: number;
  dominanceRatio?: number;
};

const INTERACTIVE_SELECTOR =
  "button, a, input, textarea, select, [role='button']";

type TouchStartData = {
  x: number;
  y: number;
  skipSwipe: boolean;
};

const shouldSkipSwipe = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest(INTERACTIVE_SELECTOR));
};

export const useHorizontalSwipe = ({
  onSwipeLeft,
  onSwipeRight,
  minDistance = 44,
  dominanceRatio = 1.2,
}: UseHorizontalSwipeOptions): {
  onTouchStart: TouchEventHandler;
  onTouchEnd: TouchEventHandler;
  onTouchCancel: TouchEventHandler;
} => {
  const touchStartRef = useRef<TouchStartData | null>(null);

  const onTouchStart = useCallback<TouchEventHandler>((event) => {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      skipSwipe: shouldSkipSwipe(event.target),
    };
  }, []);

  const onTouchEnd = useCallback<TouchEventHandler>(
    (event) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;

      if (!start || start.skipSwipe) {
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const isHorizontalSwipe =
        Math.abs(deltaX) >= minDistance &&
        Math.abs(deltaX) > Math.abs(deltaY) * dominanceRatio;

      if (!isHorizontalSwipe) {
        return;
      }

      if (deltaX < 0) {
        onSwipeLeft();
        return;
      }

      onSwipeRight();
    },
    [dominanceRatio, minDistance, onSwipeLeft, onSwipeRight],
  );

  const onTouchCancel = useCallback<TouchEventHandler>(() => {
    touchStartRef.current = null;
  }, []);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
  };
};
