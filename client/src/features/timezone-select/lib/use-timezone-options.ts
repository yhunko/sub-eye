import { getTimeZones } from "@vvo/tzdb";
import { formatGmtOffset } from "./format-gmt-offset";
import { useMemo } from "react";

export type TimezoneOption = {
  value: string;
  label: string;
  offset: string;
  abbrev: string;
  group: string;
};
export const useTimezoneOptions = () => {
  return useMemo(() => {
    const timeZones = getTimeZones({ includeUtc: true })
      // Filter out russia (countryCode "RU")
      .filter((tz) => tz.countryCode !== "RU");

    return timeZones
      .map((tz) => {
        const offset = formatGmtOffset(tz.currentTimeOffsetInMinutes);
        const city =
          tz.mainCities[0] ||
          tz.name.split("/").pop()?.replace(/_/g, " ") ||
          tz.name;
        const group = tz.name.indexOf("/") > -1 ? tz.name.split("/")[0] : "UTC";

        return {
          value: tz.name,
          label: `${city} (${offset})`,
          offset,
          abbrev: tz.abbreviation,
          group,
        };
      })
      .sort(
        (a, b) =>
          a.group.localeCompare(b.group) || a.label.localeCompare(b.label),
      );
  }, []);
};
