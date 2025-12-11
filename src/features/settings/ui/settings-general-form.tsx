import { PreferredCurrencySelect } from "./preferred-currency-select";
import { PreferredTimezoneSelect } from "./preferred-timezone-select";
import { ThemeSelect } from "./theme-select";

export const SettingsGeneralForm = () => {
  return (
    <div className="space-y-4">
      <ThemeSelect />
      <PreferredCurrencySelect />
      <PreferredTimezoneSelect />
    </div>
  );
};
