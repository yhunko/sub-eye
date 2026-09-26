import { getLegalDoc } from "../../../packages/legal/src/index";
import { CURRENCIES } from "../../mobile/src/shared/lib/format/currencies";
import seed from "../../mobile/src/shared/lib/store/fx-seed.json";

console.log(
  JSON.stringify({
    "legal-en.json": [
      getLegalDoc("privacy-policy", "en"),
      getLegalDoc("terms-of-service", "en"),
    ],
    "legal-uk.json": [
      getLegalDoc("privacy-policy", "uk"),
      getLegalDoc("terms-of-service", "uk"),
    ],
    "currencies.json": Object.keys(CURRENCIES),
    "fx-seed.json": seed,
  }),
);
