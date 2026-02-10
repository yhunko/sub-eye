export type DateFormatType =
  | "DD.MM.YYYY"
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "YYYY-MM-DD";

export interface DateFormatConfig {
  format: DateFormatType;
  mask: string;
  placeholder: string;
  dateFnsFormat: string;
}

export class DateFormatUtils {
  static readonly FORMATS: Record<DateFormatType, DateFormatConfig> = {
    "DD.MM.YYYY": {
      format: "DD.MM.YYYY",
      mask: "99.99.9999",
      placeholder: "DD.MM.YYYY",
      dateFnsFormat: "dd.MM.yyyy",
    },
    "DD/MM/YYYY": {
      format: "DD/MM/YYYY",
      mask: "99/99/9999",
      placeholder: "DD/MM/YYYY",
      dateFnsFormat: "dd/MM/yyyy",
    },
    "MM/DD/YYYY": {
      format: "MM/DD/YYYY",
      mask: "99/99/9999",
      placeholder: "MM/DD/YYYY",
      dateFnsFormat: "MM/dd/yyyy",
    },
    "YYYY-MM-DD": {
      format: "YYYY-MM-DD",
      mask: "9999-99-99",
      placeholder: "YYYY-MM-DD",
      dateFnsFormat: "yyyy-MM-dd",
    },
  };

  static readonly DEFAULT_FORMAT: DateFormatType = "DD/MM/YYYY";

  /**
   * Get format configuration by format type
   */
  static getConfig(format?: string): DateFormatConfig {
    if (format && format in this.FORMATS) {
      return this.FORMATS[format as DateFormatType];
    }
    return this.FORMATS[this.DEFAULT_FORMAT];
  }

  /**
   * Detect browser's locale date format
   */
  static detectBrowserFormat(): DateFormatType {
    const testDate = new Date(2024, 0, 15); // Jan 15, 2024
    const formatted = testDate.toLocaleDateString();

    // Check if it starts with day (DD/MM/YYYY)
    if (formatted.startsWith("15")) {
      return "DD/MM/YYYY";
    }

    // Check if it starts with month (MM/DD/YYYY)
    if (formatted.startsWith("1") || formatted.startsWith("01")) {
      return "MM/DD/YYYY";
    }

    // Check if it starts with year (YYYY-MM-DD)
    if (formatted.startsWith("2024")) {
      return "YYYY-MM-DD";
    }

    // Default fallback
    return this.DEFAULT_FORMAT;
  }

  /**
   * Get format with fallback chain: user preference -> browser locale -> default
   */
  static getPreferredFormat(userFormat?: string): DateFormatConfig {
    if (userFormat && userFormat in this.FORMATS) {
      return this.FORMATS[userFormat as DateFormatType];
    }

    const browserFormat = this.detectBrowserFormat();
    return this.FORMATS[browserFormat];
  }

  /**
   * Get all available formats for UI selection
   */
  static getAllFormats(): DateFormatConfig[] {
    return Object.values(this.FORMATS);
  }
}
