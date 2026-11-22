import { useCallback, useEffect, useState, type RefObject } from "react";
import { useWindowDimensions, type View } from "react-native";

export interface AnchorMeasurement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnchorPlacement = "top" | "bottom" | "left" | "right" | "auto";

export interface ComputeAnchoredRectOptions {
  anchor: AnchorMeasurement;
  contentWidth: number;
  contentHeight: number;
  windowWidth: number;
  windowHeight: number;
  preferredPlacement?: AnchorPlacement;
  align?: "start" | "center" | "end";
  offset?: number;
  viewportPadding?: number;
}

export interface AnchoredRectResult {
  top: number;
  left: number;
  resolvedPlacement: "top" | "bottom" | "left" | "right";
}

export function computeAnchoredPosition({
  anchor,
  contentWidth,
  contentHeight,
  windowWidth,
  windowHeight,
  preferredPlacement = "bottom",
  align = "start",
  offset = 6,
  viewportPadding = 12,
}: ComputeAnchoredRectOptions): AnchoredRectResult {
  const spaceBelow =
    windowHeight - (anchor.y + anchor.height) - viewportPadding;
  const spaceAbove = anchor.y - viewportPadding;
  const spaceRight =
    windowWidth - (anchor.x + anchor.width) - viewportPadding;
  const spaceLeft = anchor.x - viewportPadding;

  let placement: "top" | "bottom" | "left" | "right" = "bottom";

  if (preferredPlacement === "auto") {
    placement =
      spaceBelow >= contentHeight || spaceBelow >= spaceAbove
        ? "bottom"
        : "top";
  } else if (preferredPlacement === "bottom") {
    placement =
      spaceBelow < contentHeight && spaceAbove > spaceBelow ? "top" : "bottom";
  } else if (preferredPlacement === "top") {
    placement =
      spaceAbove < contentHeight && spaceBelow > spaceAbove ? "bottom" : "top";
  } else if (preferredPlacement === "left") {
    placement =
      spaceLeft < contentWidth && spaceRight > spaceLeft ? "right" : "left";
  } else {
    placement =
      spaceRight < contentWidth && spaceLeft > spaceRight ? "left" : "right";
  }

  let top = anchor.y + anchor.height + offset;
  let left = anchor.x;

  if (placement === "top") {
    top = anchor.y - contentHeight - offset;
  } else if (placement === "bottom") {
    top = anchor.y + anchor.height + offset;
  } else if (placement === "left") {
    left = anchor.x - contentWidth - offset;
    top =
      align === "start"
        ? anchor.y
        : align === "end"
          ? anchor.y + anchor.height - contentHeight
          : anchor.y + anchor.height / 2 - contentHeight / 2;
  } else {
    left = anchor.x + anchor.width + offset;
    top =
      align === "start"
        ? anchor.y
        : align === "end"
          ? anchor.y + anchor.height - contentHeight
          : anchor.y + anchor.height / 2 - contentHeight / 2;
  }

  if (placement === "top" || placement === "bottom") {
    if (align === "center") {
      left = anchor.x + anchor.width / 2 - contentWidth / 2;
    } else if (align === "end") {
      left = anchor.x + anchor.width - contentWidth;
    } else {
      left = anchor.x;
    }
  }

  const maxLeft = Math.max(
    viewportPadding,
    windowWidth - contentWidth - viewportPadding,
  );
  const maxTop = Math.max(
    viewportPadding,
    windowHeight - contentHeight - viewportPadding,
  );

  return {
    top: Math.max(viewportPadding, Math.min(top, maxTop)),
    left: Math.max(viewportPadding, Math.min(left, maxLeft)),
    resolvedPlacement: placement,
  };
}

export interface MeasurableAnchorNode {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
  measure?: (
    callback: (
      x: number,
      y: number,
      width: number,
      height: number,
      pageX: number,
      pageY: number,
    ) => void,
  ) => void;
}

export function measureAnchorNode(
  ref: RefObject<View | MeasurableAnchorNode | null>,
  onMeasured: (rect: AnchorMeasurement) => void,
) {
  const node = ref.current as MeasurableAnchorNode | null;
  if (!node) return;

  if (typeof node.measureInWindow === "function") {
    node.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        onMeasured({ x, y, width, height });
        return;
      }
      if (typeof node.measure === "function") {
        node.measure((_x, _y, mw, mh, pageX, pageY) => {
          if (mw > 0 && mh > 0) {
            onMeasured({
              x: pageX ?? 0,
              y: pageY ?? 0,
              width: mw,
              height: mh,
            });
          }
        });
      }
    });
  }
}

export function useAnchorPosition(
  triggerRef: RefObject<View | MeasurableAnchorNode | null>,
) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [anchor, setAnchor] = useState<AnchorMeasurement | null>(null);

  const measure = useCallback(
    (onReady?: (rect: AnchorMeasurement) => void) => {
      measureAnchorNode(triggerRef, (rect) => {
        setAnchor(rect);
        onReady?.(rect);
      });
    },
    [triggerRef],
  );

  return {
    anchor,
    setAnchor,
    measure,
    windowWidth,
    windowHeight,
  };
}

export function useDelayedUnmount(visible: boolean, delayMs: number): boolean {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => {
      setMounted(false);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [delayMs, visible]);

  return visible || mounted;
}
