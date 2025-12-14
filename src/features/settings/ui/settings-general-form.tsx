import { PreferredCurrencySelect } from "./preferred-currency-select";
import { PreferredTimezoneSelect } from "./preferred-timezone-select";
import { ThemeSelect } from "./theme-select";
import { SettingsFormLayout } from "./settings-form-layout";

export const SettingsGeneralForm = () => {
  return (
    <SettingsFormLayout>
      <ThemeSelect />
      <PreferredCurrencySelect />
      <PreferredTimezoneSelect />
    </SettingsFormLayout>
  );
};
