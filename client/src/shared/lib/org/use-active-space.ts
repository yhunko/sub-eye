import {
  useClerk,
  useOrganization,
  useOrganizationList,
} from "@clerk/clerk-react";
import { useCallback } from "react";

export type ActiveSpace = "personal" | string; // string = orgId

const ORGANIZATION_LIST_OPTIONS = { userMemberships: true } as const;

export function useActiveSpace() {
  const clerk = useClerk();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { isLoaded: isOrgListLoaded, userMemberships } = useOrganizationList(
    ORGANIZATION_LIST_OPTIONS,
  );

  // Both must be loaded to have a stable space value
  const isLoaded = isOrgLoaded && isOrgListLoaded;

  const space: ActiveSpace = organization?.id ?? "personal";

  const switchToPersonal = useCallback(() => {
    void clerk.setActive({ organization: null });
  }, [clerk]);

  const switchToOrg = useCallback(
    (orgId: string) => {
      void clerk.setActive({ organization: orgId });
    },
    [clerk],
  );

  return {
    space,
    isPersonal: space === "personal",
    orgId: organization?.id ?? null,
    organization,
    isLoaded,
    userMemberships,
    switchToPersonal,
    switchToOrg,
  };
}
