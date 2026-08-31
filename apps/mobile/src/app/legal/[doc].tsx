import { isLegalDocKind } from "@subeye/legal";
import { useLocalSearchParams } from "expo-router";
import { LegalSheet } from "@/widgets/legal-sheet";

export default function LegalRoute() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  // Every route is deep-linkable, so this param can be anything a URL carries.
  return <LegalSheet kind={isLegalDocKind(doc) ? doc : "terms-of-service"} />;
}
