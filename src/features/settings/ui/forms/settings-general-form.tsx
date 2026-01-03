import { PreferredCurrencySelect } from "../preferred-currency-select";
import { PreferredTimezoneSelect } from "../preferred-timezone-select";
import { ThemeSelect } from "../theme-select";
import { SettingsFormLayout } from "./settings-form-layout";
import { ItemGroup } from "@/shared/components";

export const SettingsGeneralForm = () => {
  return (
    <SettingsFormLayout>
      <ItemGroup className="gap-4">
        <ThemeSelect />
        <PreferredCurrencySelect />
        <PreferredTimezoneSelect />
      </ItemGroup>
    </SettingsFormLayout>
  );
};
