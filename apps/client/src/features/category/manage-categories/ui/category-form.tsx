import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  type CreateCategoryInput,
  CreateCategorySchema,
  DEFAULT_CATEGORY_EMOJI,
} from "@subeye/shared";
import { useForm } from "react-hook-form";
import { EmojiPicker } from "@/entities/category";
import * as m from "@/i18n/messages";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Spinner,
} from "@/shared/components";

type CategoryFormProps = {
  defaultValues?: Partial<CreateCategoryInput>;
  onSubmit: (data: CreateCategoryInput) => void;
  isPending?: boolean;
  submitLabel?: string;
};

export const CategoryForm = ({
  defaultValues,
  onSubmit,
  isPending = false,
  submitLabel,
}: CategoryFormProps) => {
  const form = useForm<CreateCategoryInput>({
    resolver: valibotResolver(CreateCategorySchema),
    defaultValues: {
      name: "",
      emoji: DEFAULT_CATEGORY_EMOJI,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="emoji"
            render={({ field, fieldState }) => (
              <FormItem className="w-16 shrink-0 gap-1">
                <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
                  {m.categories_form_emoji_label()}
                </FormLabel>
                <FormControl>
                  <EmojiPicker
                    value={field.value}
                    onChange={field.onChange}
                    hasError={!!fieldState.error}
                  />
                </FormControl>
                {fieldState.error && (
                  <p className="text-destructive text-sm font-medium">
                    {m.categories_form_emoji_required()}
                  </p>
                )}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1 gap-1">
                <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
                  {m.categories_form_name_label()}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="off"
                    placeholder={m.categories_form_name_placeholder()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Spinner />}
          {submitLabel ?? m.categories_action_add()}
        </Button>
      </form>
    </Form>
  );
};
