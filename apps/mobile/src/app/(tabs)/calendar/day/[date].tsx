import { useLocalSearchParams } from "expo-router";
import { DaySheet } from "@/widgets/calendar-page";

export default function CalendarDayRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <DaySheet date={date} />;
}
