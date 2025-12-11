import { FC } from "react";
import { ThemeSwitchButton } from "../../theme";
import { FieldLabel, Field } from "@/shared/components";

export const ThemeSelect: FC = () => {
  return (
    <Field>
      <FieldLabel>Theme</FieldLabel>
      <ThemeSwitchButton />
    </Field>
  );
};
