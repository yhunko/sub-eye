import type { CategoryAiSuggestion } from "@subeye/shared";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { BrandfetchImage } from "@/entities/brandfetch";
import { EmojiPicker } from "@/entities/category";
import * as m from "@/i18n/messages";
import { Input, Separator, Toggle } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { SuggestionToggleButton } from "./suggestion-toggle-button";

type CategoryAiSuggestionItemProps = {
  suggestion: CategoryAiSuggestion;
  index: number;
  assignmentOptions: string[];
  subscriptionById: Map<
    string,
    {
      name: string;
      brandDomain: string | null;
      categoryId: string | null;
    }
  >;
  onEnabledChange: (draftId: string, next: boolean) => void;
  onEmojiChange: (draftId: string, emoji: string) => void;
  onNameChange: (draftId: string, name: string) => void;
  onAssignmentChange: (
    draftId: string,
    subscriptionId: string,
    next: boolean,
  ) => void;
};

export const CategoryAiSuggestionItem = ({
  suggestion,
  index,
  assignmentOptions,
  subscriptionById,
  onEnabledChange,
  onEmojiChange,
  onNameChange,
  onAssignmentChange,
}: CategoryAiSuggestionItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: suggestion.enabled ? 1 : 0.5, y: 0 }}
      transition={{
        opacity: { duration: 0.2 },
        y: { type: "spring", stiffness: 400, damping: 28, delay: index * 0.06 },
      }}
      className="border-border relative rounded-xl border p-3"
    >
      <SuggestionToggleButton
        enabled={suggestion.enabled}
        onToggle={() =>
          onEnabledChange(suggestion.draftId, !suggestion.enabled)
        }
        toggleLabel={m.categories_ai_include_toggle()}
        tooltipText={m.categories_ai_include_toggle_tooltip()}
      />

      {/* Emoji + name — padded to avoid overlap with toggle button */}
      <div className="flex items-center gap-2 pr-9">
        <div className="w-16 shrink-0">
          <EmojiPicker
            value={suggestion.emoji}
            triggerClassName="h-11 cursor-pointer"
            onChange={(emoji) => onEmojiChange(suggestion.draftId, emoji)}
          />
        </div>

        <Input
          value={suggestion.name}
          className="min-h-11 flex-1"
          aria-label={m.categories_form_name_label()}
          onChange={(event) =>
            onNameChange(suggestion.draftId, event.target.value)
          }
        />
      </div>

      <Separator className="my-3" />

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs uppercase">
          {m.categories_ai_assignments_title({
            count: String(suggestion.subscriptionIds.length),
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          {assignmentOptions.map((subscriptionId) => {
            const checked = suggestion.subscriptionIds.includes(subscriptionId);
            const subscriptionMeta = subscriptionById.get(subscriptionId);
            const subscriptionLabel = subscriptionMeta?.name ?? subscriptionId;

            return (
              <Toggle
                key={subscriptionId}
                type="button"
                variant="outline"
                size="sm"
                pressed={checked}
                disabled={!suggestion.enabled}
                aria-label={m.categories_ai_assignment_toggle_aria({
                  name: subscriptionLabel,
                })}
                onPressedChange={(next) =>
                  onAssignmentChange(suggestion.draftId, subscriptionId, next)
                }
                className={cn(
                  "h-9 rounded-full px-3 text-sm",
                  checked
                    ? "cursor-pointer border-cyan-400/60 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
                    : "border-input bg-background cursor-pointer",
                  !suggestion.enabled && "cursor-not-allowed",
                )}
              >
                <Check
                  className={cn(
                    "size-3.5",
                    checked ? "opacity-100" : "opacity-40",
                  )}
                />
                <BrandfetchImage
                  domain={subscriptionMeta?.brandDomain}
                  className="size-4 rounded-sm"
                  decorative
                />
                <span>{subscriptionLabel}</span>
              </Toggle>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
