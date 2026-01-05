import { PreferredCurrencySelect } from "../preferred-currency-select";
import { PreferredTimezoneSelect } from "../preferred-timezone-select";
import { ThemeSelect } from "../theme-select";
import { SettingsFormLayout } from "./settings-form-layout";
import { ItemGroup } from "@/shared/components";
import { LocaleSelect } from "../locale-select";

export const SettingsGeneralForm = () => {
  return (
    <SettingsFormLayout>
      <ItemGroup className="gap-4">
        <LocaleSelect />
        <ThemeSelect />
        <PreferredCurrencySelect />
        <PreferredTimezoneSelect />
      </ItemGroup>
    </SettingsFormLayout>
  );
};
