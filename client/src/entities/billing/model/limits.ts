export const isAtLimit = (
  metric: { current: number; limit: number | null } | null | undefined,
): boolean =>
  metric != null && metric.limit !== null && metric.current >= metric.limit;
