import { TELEGRAM_TEMPLATE_VARIABLES } from "@subeye/shared";

const PLACEHOLDER_REGEX = /\{([a-z_]+)\}/g;
const ALLOWED_VARIABLES = new Set<string>(TELEGRAM_TEMPLATE_VARIABLES);

export const TELEGRAM_TEMPLATE_MAX_LENGTH = 2000;

export const insertTokenAtSelection = (
  input: string,
  token: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; cursorPosition: number } => {
  const safeStart = Math.max(0, Math.min(selectionStart, input.length));
  const safeEnd = Math.max(safeStart, Math.min(selectionEnd, input.length));
  const value = `${input.slice(0, safeStart)}${token}${input.slice(safeEnd)}`;

  return {
    value,
    cursorPosition: safeStart + token.length,
  };
};

export const extractTemplateVariables = (template: string): string[] => {
  const variables: string[] = [];

  for (const match of template.matchAll(PLACEHOLDER_REGEX)) {
    const variable = match[1];
    if (variable) {
      variables.push(variable);
    }
  }

  return variables;
};

export const getTemplateUnknownVariables = (template: string): string[] => {
  const variables = extractTemplateVariables(template);

  return [...new Set(variables)].filter(
    (variable) => !ALLOWED_VARIABLES.has(variable),
  );
};

export const validateTemplateDraft = (
  template: string,
): {
  valid: boolean;
  tooLong: boolean;
  unknownVariables: string[];
} => {
  const tooLong = template.length > TELEGRAM_TEMPLATE_MAX_LENGTH;
  const unknownVariables = getTemplateUnknownVariables(template);

  return {
    valid: !tooLong && unknownVariables.length === 0,
    tooLong,
    unknownVariables,
  };
};

export const renderTemplatePreview = (
  template: string,
  values: Record<string, string>,
): string =>
  template.replace(
    PLACEHOLDER_REGEX,
    (match, variable: string) => values[variable] ?? match,
  );
