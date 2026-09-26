import { m } from "@/shared/i18n";
import type { FormErrorCode } from "../model/form-schema";

// Message-function references, invoked at call time — never at module scope, or
// the string freezes in whichever locale was active at import.
const VALIDATION_MESSAGE: Record<FormErrorCode, () => string> = {
  required: m.validation_required,
  invalidNumber: m.validation_invalidNumber,
  positiveNumber: m.validation_positiveNumber,
  wholeNumber: m.validation_wholeNumber,
  futureDate: m.validation_futureDate,
};

/**
 * The sentence for a schema code. Its own module because `cadence-field` needs
 * it too, and reaching back into `form-fields` for it would be a cycle — that
 * file already imports the cadence field.
 */
export const messageFor = (code: FormErrorCode | undefined) =>
  code ? VALIDATION_MESSAGE[code]() : undefined;
