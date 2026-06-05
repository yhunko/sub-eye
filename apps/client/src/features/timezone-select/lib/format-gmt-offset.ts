export const formatGmtOffset = (minutes: number) => {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const min = Math.abs(minutes) % 60;
  const sign = minutes >= 0 ? "+" : "-";
  return `GMT${sign}${String(hours).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};
