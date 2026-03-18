import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components";
import * as m from "@/i18n/messages";
import { CategoryAiWorkbenchProvider } from "./model/category-ai-workbench-context";
import { CategoryAiGenerateFlow } from "./ui/category-ai-generate-flow";
import { CategoryAiOptimizeFlow } from "./ui/category-ai-optimize-flow";

type CategoryAiMode = "generate" | "optimize";

export const CategoryAiGenerator = () => {
  const [mode, setMode] = useState<CategoryAiMode>("generate");

  return (
    <CategoryAiWorkbenchProvider>
      <div className="space-y-4">
        <Card>
          <CardHeader className="gap-2">
            <CardTitle>{m.categories_ai_workbench_title()}</CardTitle>
            <CardDescription>
              {m.categories_ai_workbench_description()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(next) => {
                if (next === "generate" || next === "optimize") {
                  setMode(next);
                }
              }}
              variant="outline"
              className="w-full"
            >
              <ToggleGroupItem value="generate" className="flex-1">
                {m.categories_ai_mode_generate()}
              </ToggleGroupItem>
              <ToggleGroupItem value="optimize" className="flex-1">
                {m.categories_ai_mode_optimize()}
              </ToggleGroupItem>
            </ToggleGroup>
          </CardContent>
        </Card>

        {mode === "generate" ? (
          <CategoryAiGenerateFlow />
        ) : (
          <CategoryAiOptimizeFlow />
        )}
      </div>
    </CategoryAiWorkbenchProvider>
  );
};
