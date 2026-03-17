const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

export const resolveNextEmojiFocusIndex = ({
  key,
  currentIndex,
  total,
  cols = 6,
}: {
  key: string;
  currentIndex: number;
  total: number;
  cols?: number;
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
      return clamp(currentIndex + cols, 0, lastIndex);
    case "ArrowUp":
      return clamp(currentIndex - cols, 0, lastIndex);
    default:
      return null;
  }
};
