import { useFormContext } from "react-hook-form";
import { BrandfetchPicker } from "@/features/brandfetch";
import * as m from "@/i18n/messages";
import { FormField, FormMessage } from "@/shared/components";
import type { AddSubscriptionInput } from "../../model/schema";

export const AddSubscriptionBrandImage = () => {
  const { control } = useFormContext<AddSubscriptionInput>();

  return (
    <FormField
      control={control}
      name="brandDomain"
      render={({ field }) => (
        <div className="space-y-1.5">
          <div className="flex flex-col items-center gap-2 py-1">
            <BrandfetchPicker
              value={field.value ?? undefined}
              onChange={field.onChange}
              triggerVariant="hero"
            />
            <p className="text-muted-foreground text-xs">
              {m.subscription_form_icon_hint()}
            </p>
          </div>
          <FormMessage className="text-center text-xs" />
        </div>
      )}
    />
  );
};
