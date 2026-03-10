import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState, type DragEventHandler } from "react";
import { toast } from "sonner";
import { PlanFeatureLockCard, planUsageQuery } from "@/entities/billing";
import {
  Badge,
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Textarea,
} from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import type {
  TelegramNotificationStatus,
  TelegramTemplateVariable,
} from "shared";
import {
  insertTokenAtSelection,
  renderTemplatePreview,
  TELEGRAM_TEMPLATE_MAX_LENGTH,
  validateTemplateDraft,
} from "../lib/telegram-message-template.utils";
import { useUpdateTelegramMessageTemplate } from "../api/hooks";
import * as m from "@/i18n/messages";

type TelegramTemplateBuilderCardProps = {
  status: TelegramNotificationStatus;
  withContainer?: boolean;
  showHeader?: boolean;
};

type TemplateVariableGroup = {
  key: "renewal" | "pricing";
  label: string;
  variables: Array<{
    key: TelegramTemplateVariable;
    label: string;
  }>;
};

export const TelegramTemplateBuilderCard = ({
  status,
  withContainer = true,
  showHeader = true,
}: TelegramTemplateBuilderCardProps) => {
  const { userId } = useAuth();
  const isDesktop = useBreakpoint("md");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [draftTemplate, setDraftTemplate] = useState(
    status.messageTemplate.template,
  );
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const { data: usage } = useQuery(
    planUsageQuery({
      params: { userId: userId! },
      options: {
        enabled: Boolean(userId),
      },
    }),
  );

  const { mutateAsync: updateTemplate, isPending } =
    useUpdateTelegramMessageTemplate();

  const canUseCustomTemplate = usage?.features.telegramMessageTemplate === true;
  const isLinked = status.linked;
  const isEditable = canUseCustomTemplate && isLinked && !isPending;

  const validation = useMemo(
    () => validateTemplateDraft(draftTemplate),
    [draftTemplate],
  );

  const isDirty = draftTemplate !== status.messageTemplate.template;

  const previewValues = useMemo(
    () => ({
      subscription_name:
        m.settings_notifications_telegram_template_sample_subscriptionName(),
      renewal_relative_day:
        m.settings_notifications_telegram_template_sample_relativeDay(),
      price_preferred:
        m.settings_notifications_telegram_template_sample_pricePreferred(),
      price_original:
        m.settings_notifications_telegram_template_sample_priceOriginal(),
      renewal_date:
        m.settings_notifications_telegram_template_sample_renewalDate(),
    }),
    [],
  );

  const previewText = useMemo(
    () => renderTemplatePreview(draftTemplate, previewValues),
    [draftTemplate, previewValues],
  );

  const variableGroups = useMemo<TemplateVariableGroup[]>(
    () => [
      {
        key: "renewal",
        label: m.settings_notifications_telegram_template_group_renewal(),
        variables: [
          {
            key: "subscription_name",
            label:
              m.settings_notifications_telegram_template_var_subscriptionName(),
          },
          {
            key: "renewal_relative_day",
            label: m.settings_notifications_telegram_template_var_relativeDay(),
          },
          {
            key: "renewal_date",
            label: m.settings_notifications_telegram_template_var_renewalDate(),
          },
        ],
      },
      {
        key: "pricing",
        label: m.settings_notifications_telegram_template_group_pricing(),
        variables: [
          {
            key: "price_preferred",
            label:
              m.settings_notifications_telegram_template_var_pricePreferred(),
          },
          {
            key: "price_original",
            label:
              m.settings_notifications_telegram_template_var_priceOriginal(),
          },
        ],
      },
    ],
    [],
  );

  const handleSelectionChange = () => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    setSelection({
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    });
  };

  const insertVariableToken = (variable: TelegramTemplateVariable) => {
    if (!isEditable) {
      return;
    }

    const token = `{${variable}}`;
    const textarea = textareaRef.current;

    const start = textarea?.selectionStart ?? selection.start;
    const end = textarea?.selectionEnd ?? selection.end;

    const { value, cursorPosition } = insertTokenAtSelection(
      draftTemplate,
      token,
      start,
      end,
    );

    setDraftTemplate(value);
    setSelection({ start: cursorPosition, end: cursorPosition });

    requestAnimationFrame(() => {
      const input = textareaRef.current;
      if (!input) {
        return;
      }

      input.focus();
      input.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const handleDropTemplateVariable: DragEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    event.preventDefault();

    const variable = event.dataTransfer.getData("text/plain") as
      | TelegramTemplateVariable
      | "";

    if (!variable) {
      return;
    }

    insertVariableToken(variable);
  };

  const handleSave = async () => {
    if (!isEditable || !validation.valid || !isDirty) {
      return;
    }

    try {
      await updateTemplate({
        messageTemplate: {
          version: 1,
          template: draftTemplate,
        },
      });
      toast.success(m.settings_notifications_telegram_template_saved());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : m.settings_notifications_telegram_template_saveFailed(),
      );
    }
  };

  const handleReset = () => {
    setDraftTemplate(status.defaultMessageTemplate.template);
  };

  const containerClassName = withContainer
    ? "space-y-4 rounded-xl border p-4"
    : "space-y-4";

  return (
    <div className={containerClassName}>
      {showHeader && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">
              {m.settings_notifications_telegram_template_title()}
            </h3>
            <Badge variant="outline">
              {status.isCustomTemplate
                ? m.settings_notifications_telegram_template_badgeCustom()
                : m.settings_notifications_telegram_template_badgeDefault()}
            </Badge>
          </div>

          <p className="text-muted-foreground text-sm">
            {m.settings_notifications_telegram_template_description()}
          </p>
        </div>
      )}

      {!canUseCustomTemplate && (
        <PlanFeatureLockCard
          title={m.settings_notifications_telegram_template_lockTitle()}
          description={m.settings_notifications_telegram_template_lockDescription()}
        />
      )}

      {!isLinked && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
          {m.settings_notifications_telegram_template_connectHint()}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-12 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="space-y-3 md:col-span-7 xl:col-auto">
          <Field>
            <FieldLabel htmlFor="telegram-template-editor">
              {m.settings_notifications_telegram_template_editorLabel()}
            </FieldLabel>
            <Textarea
              id="telegram-template-editor"
              ref={textareaRef}
              value={draftTemplate}
              onChange={(event) => setDraftTemplate(event.target.value)}
              onSelect={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onClick={handleSelectionChange}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDropTemplateVariable}
              disabled={!isEditable}
              rows={8}
              maxLength={TELEGRAM_TEMPLATE_MAX_LENGTH}
              placeholder={m.settings_notifications_telegram_template_placeholder()}
              className="font-mono text-sm"
            />
            <FieldDescription>
              {m.settings_notifications_telegram_template_editorHint()}
            </FieldDescription>
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">
              {draftTemplate.length}/{TELEGRAM_TEMPLATE_MAX_LENGTH}
            </span>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isPending || !isLinked}
              >
                {m.settings_notifications_telegram_template_reset()}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={!isEditable || !validation.valid || !isDirty}
              >
                {isPending
                  ? m.settings_notifications_telegram_template_saving()
                  : m.settings_notifications_telegram_template_save()}
              </Button>
            </div>
          </div>

          {!validation.valid && (
            <div className="border-destructive/30 bg-destructive/5 text-destructive space-y-1 rounded-md border p-3 text-xs">
              {validation.tooLong && (
                <p>
                  {m.settings_notifications_telegram_template_validationTooLong(
                    {
                      max: String(TELEGRAM_TEMPLATE_MAX_LENGTH),
                    },
                  )}
                </p>
              )}
              {validation.unknownVariables.length > 0 && (
                <p>
                  {m.settings_notifications_telegram_template_validationUnknown(
                    {
                      variables: validation.unknownVariables.join(", "),
                    },
                  )}
                </p>
              )}
            </div>
          )}

          <div className="bg-muted/20 space-y-2 rounded-lg border p-3">
            <p className="text-xs font-medium">
              {m.settings_notifications_telegram_template_previewTitle()}
            </p>
            <pre className="max-h-40 overflow-auto text-sm break-words whitespace-pre-wrap">
              {previewText}
            </pre>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-3 md:col-span-5 xl:col-auto">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase">
              {m.settings_notifications_telegram_template_variablesTitle()}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {isDesktop
                ? m.settings_notifications_telegram_template_dragHint()
                : m.settings_notifications_telegram_template_tapHint()}
            </p>
          </div>

          <div className="space-y-3">
            {variableGroups.map((group) => (
              <div key={group.key} className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.variables.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      draggable={isDesktop && isEditable}
                      onClick={() => insertVariableToken(variable.key)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", variable.key);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      disabled={!isEditable}
                      className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="font-mono">{`{${variable.key}}`}</span>
                      <span className="text-muted-foreground">
                        {variable.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
