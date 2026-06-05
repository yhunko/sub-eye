const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

const resolveGroupMeta = (
  currentIndex: number,
  groupSizes: readonly number[],
  cols: number,
) => {
  let start = 0;

  for (let groupIndex = 0; groupIndex < groupSizes.length; groupIndex++) {
    const size = groupSizes[groupIndex] ?? 0;
    const end = start + size - 1;

    if (currentIndex >= start && currentIndex <= end) {
      const localIndex = currentIndex - start;
      return {
        groupIndex,
        groupStart: start,
        groupSize: size,
        row: Math.floor(localIndex / cols),
        col: localIndex % cols,
      };
    }

    start += size;
  }

  return null;
};

const resolveIndexInGroup = ({
  groupStart,
  groupSize,
  col,
  direction,
  fromRowExclusive,
  cols,
}: {
  groupStart: number;
  groupSize: number;
  col: number;
  direction: "up" | "down";
  fromRowExclusive: number;
  cols: number;
}): number | null => {
  const rowCount = Math.ceil(groupSize / cols);

  if (direction === "down") {
    for (let row = fromRowExclusive + 1; row < rowCount; row++) {
      const rowStart = row * cols;
      const rowLen = Math.min(cols, groupSize - rowStart);
      if (col < rowLen) {
        return groupStart + rowStart + col;
      }
    }
    return null;
  }

  for (let row = fromRowExclusive - 1; row >= 0; row--) {
    const rowStart = row * cols;
    const rowLen = Math.min(cols, groupSize - rowStart);
    if (col < rowLen) {
      return groupStart + rowStart + col;
    }
  }
  return null;
};

const resolveVerticalMove = ({
  direction,
  currentIndex,
  groupSizes,
  cols,
}: {
  direction: "up" | "down";
  currentIndex: number;
  groupSizes: readonly number[];
  cols: number;
}): number | null => {
  const meta = resolveGroupMeta(currentIndex, groupSizes, cols);
  if (!meta) {
    return null;
  }

  const { groupIndex, groupStart, groupSize, row, col } = meta;
  if (direction === "down") {
    const inCurrentGroup = resolveIndexInGroup({
      groupStart,
      groupSize,
      col,
      direction: "down",
      fromRowExclusive: row,
      cols,
    });
    if (inCurrentGroup !== null) {
      return inCurrentGroup;
    }

    let nextGroupStart = groupStart + groupSize;
    for (let idx = groupIndex + 1; idx < groupSizes.length; idx++) {
      const nextGroupSize = groupSizes[idx] ?? 0;
      if (nextGroupSize <= 0) {
        continue;
      }

      const inNextGroup = resolveIndexInGroup({
        groupStart: nextGroupStart,
        groupSize: nextGroupSize,
        col,
        direction: "down",
        fromRowExclusive: -1,
        cols,
      });
      if (inNextGroup !== null) {
        return inNextGroup;
      }

      nextGroupStart += nextGroupSize;
    }

    return currentIndex;
  }

  const inCurrentGroup = resolveIndexInGroup({
    groupStart,
    groupSize,
    col,
    direction: "up",
    fromRowExclusive: row,
    cols,
  });
  if (inCurrentGroup !== null) {
    return inCurrentGroup;
  }

  let prevGroupStart = groupStart;
  for (let idx = groupIndex - 1; idx >= 0; idx--) {
    const prevGroupSize = groupSizes[idx] ?? 0;
    prevGroupStart -= prevGroupSize;

    if (prevGroupSize <= 0) {
      continue;
    }

    const inPrevGroup = resolveIndexInGroup({
      groupStart: prevGroupStart,
      groupSize: prevGroupSize,
      col,
      direction: "up",
      fromRowExclusive: Math.ceil(prevGroupSize / cols),
      cols,
    });
    if (inPrevGroup !== null) {
      return inPrevGroup;
    }
  }

  return currentIndex;
};

export const resolveNextEmojiFocusIndex = ({
  key,
  shiftKey = false,
  currentIndex,
  total,
  cols = 6,
  groupSizes = [],
}: {
  key: string;
  shiftKey?: boolean;
  currentIndex: number;
  total: number;
  cols?: number;
  groupSizes?: readonly number[];
}): number | null => {
  const lastIndex = total - 1;
  if (lastIndex < 0) {
    return null;
  }

  switch (key) {
    case "ArrowRight":
      return clamp(currentIndex + 1, 0, lastIndex);
    case "ArrowLeft":
      return clamp(currentIndex - 1, 0, lastIndex);
    case "ArrowDown":
      if (groupSizes.length > 0) {
        return (
          resolveVerticalMove({
            direction: "down",
            currentIndex,
            groupSizes,
            cols,
          }) ?? clamp(currentIndex + cols, 0, lastIndex)
        );
      }
      return clamp(currentIndex + cols, 0, lastIndex);
    case "ArrowUp":
      if (groupSizes.length > 0) {
        return (
          resolveVerticalMove({
            direction: "up",
            currentIndex,
            groupSizes,
            cols,
          }) ?? clamp(currentIndex - cols, 0, lastIndex)
        );
      }
      return clamp(currentIndex - cols, 0, lastIndex);
    case "Tab":
      if (shiftKey) {
        return currentIndex === 0 ? lastIndex : currentIndex - 1;
      }
      return currentIndex === lastIndex ? 0 : currentIndex + 1;
    default:
      return null;
  }
};
