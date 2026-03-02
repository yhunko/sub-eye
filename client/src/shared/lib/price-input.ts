const DECIMAL_SEPARATOR_REGEX = /[.,]/;
const DIGIT_REGEX = /\d/;

export const PRICE_MAX_FRACTION_DIGITS = 2;

const PRICE_PATTERN = new RegExp(
  `^\\d+(?:\\.\\d{1,${PRICE_MAX_FRACTION_DIGITS}})?$`,
);

export const normalizePriceInput = (value: string): string =>
  value.trim().replace(",", ".");

export const sanitizePriceInput = (
  value: string,
  maxFractionDigits: number = PRICE_MAX_FRACTION_DIGITS,
): string => {
  let sanitized = "";
  let hasSeparator = false;
  let fractionLength = 0;

  for (const char of value.trim()) {
    if (DIGIT_REGEX.test(char)) {
      if (hasSeparator && fractionLength >= maxFractionDigits) {
        continue;
      }

      sanitized += char;
      if (hasSeparator) {
        fractionLength += 1;
      }
      continue;
    }

    if (DECIMAL_SEPARATOR_REGEX.test(char) && !hasSeparator) {
      hasSeparator = true;
      sanitized = sanitized.length === 0 ? "0." : `${sanitized}.`;
    }
  }

  return sanitized;
};

export const parsePriceInput = (value: string): number | null => {
  const normalized = normalizePriceInput(value);

  if (!PRICE_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
