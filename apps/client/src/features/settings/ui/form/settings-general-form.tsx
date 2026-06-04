import { ItemGroup } from "@/shared/components";
import { LocaleSelect } from "../locale-select";
import { PreferredCurrencySelect } from "../preferred-currency-select";
import { PreferredDateFormatSelect } from "../preferred-date-format-select";
import { PreferredTimezoneSelect } from "../preferred-timezone-select";
import { SettingsFormLayout } from "../settings-form-layout";
import { ThemeSelect } from "../theme-select";

export const SettingsGeneralForm = () => {
  return (
    <SettingsFormLayout>
      <ItemGroup className="gap-4">
        <LocaleSelect />
        <ThemeSelect />
        <PreferredCurrencySelect />
        <PreferredDateFormatSelect />
        <PreferredTimezoneSelect />
      </ItemGroup>
    </SettingsFormLayout>
  );
};
