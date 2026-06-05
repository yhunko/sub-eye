import {
  CreateOrganization,
  useAuth,
  useOrganization,
  useOrganizationList,
} from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { ArrowRight, LogOut, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PlanFeatureLockCard, planUsageQuery } from "@/entities/billing";
import * as m from "@/i18n/messages";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";
import { SettingsFormLayout, SettingsLayout } from "@/widgets/settings-layout";

export const Route = createFileRoute("/(protected)/settings/group")({
  component: SettingsGroupPage,
  validateSearch: valibotValidator(settingsSearchSchema),
});

function SettingsGroupPage() {
  const { from } = Route.useSearch();
  const { userId } = useAuth();
  const { organization, membership, memberships } = useOrganization({
    memberships: true,
  });
  const { isLoaded, userMemberships } = useOrganizationList({
    userMemberships: true,
  });
  const { switchToPersonal, switchToOrg, isPersonal } = useActiveSpace();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const { data: planUsage } = useQuery(
    planUsageQuery({
      params: { userId: userId! },
      options: { enabled: Boolean(userId) },
    }),
  );
  const hasFamilyGroupFeature = planUsage?.features.familyGroup === true;

  const isAdmin = membership?.role === "org:admin";

  // Check if user has any org memberships when in personal space
  const hasOrganizations =
    userMemberships?.data && userMemberships.data.length > 0;
  const firstOrganization = userMemberships?.data?.[0];

  const handleInvite = async () => {
    if (!organization || !inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await organization.inviteMember({
        emailAddress: inviteEmail.trim(),
        role: "org:member",
      });
      setInviteEmail("");
      toast.success(m.family_settings_members_invite_success());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.messages_error());
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!organization) return;
    const confirmed = window.confirm(
      m.family_settings_members_remove_confirm(),
    );
    if (!confirmed) return;
    try {
      await organization.removeMember(userId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.messages_error());
    }
  };

  const handleLeave = async () => {
    if (!membership) return;
    const confirmed = window.confirm(m.family_settings_leave_confirm());
    if (!confirmed) return;
    try {
      await membership.destroy();
      switchToPersonal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.messages_error());
    }
  };

  const handleDelete = async () => {
    if (!organization) return;
    const confirmed = window.confirm(m.family_settings_delete_confirm());
    if (!confirmed) return;
    try {
      await organization.destroy();
      switchToPersonal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.messages_error());
    }
  };

  if (!isLoaded) {
    return (
      <SettingsLayout
        title={m.family_settings_title()}
        backTo="/settings"
        backToSearch={{ from }}
      >
        <SettingsFormLayout>
          <div className="text-muted-foreground py-8 text-center text-sm">
            {m.common_loading()}
          </div>
        </SettingsFormLayout>
      </SettingsLayout>
    );
  }

  // In personal space but user has organizations - show switch prompt
  if (!organization && isPersonal && hasOrganizations && firstOrganization) {
    return (
      <SettingsLayout
        title={m.family_settings_title()}
        backTo="/settings"
        backToSearch={{ from }}
      >
        <SettingsFormLayout>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                {m.family_settings_hasGroup()}
              </CardTitle>
              <CardDescription>
                {m.family_settings_hasGroup_description()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">
                {m.family_settings_hasGroup_switch({
                  name: firstOrganization.organization.name,
                })}
              </p>
              <Button
                onClick={() => switchToOrg(firstOrganization.organization.id)}
                className="w-full"
              >
                <ArrowRight className="mr-2 size-4" />
                {m.family_settings_switchToGroup({
                  name: firstOrganization.organization.name,
                })}
              </Button>
            </CardContent>
          </Card>
        </SettingsFormLayout>
      </SettingsLayout>
    );
  }

  // In personal space with no organizations - show create option
  if (!organization) {
    return (
      <SettingsLayout
        title={m.family_settings_title()}
        backTo="/settings"
        backToSearch={{ from }}
      >
        <SettingsFormLayout>
          {!hasFamilyGroupFeature ? (
            <PlanFeatureLockCard
              title={m.family_upgrade_title()}
              description={m.family_upgrade_description()}
              analyticsSource="settings_billing"
              analyticsFeature="family_group"
            />
          ) : showCreateOrg ? (
            <div className="flex justify-center">
              <CreateOrganization afterCreateOrganizationUrl="/settings/group" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  {m.family_settings_createGroup()}
                </CardTitle>
                <CardDescription>
                  {m.family_settings_createGroup_description()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 text-sm">
                  {m.family_settings_noGroup()}
                </p>
                <Button onClick={() => setShowCreateOrg(true)}>
                  <UserPlus className="mr-2 size-4" />
                  {m.family_settings_createGroup()}
                </Button>
              </CardContent>
            </Card>
          )}
        </SettingsFormLayout>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout
      title={m.family_settings_title()}
      backTo="/settings"
      backToSearch={{ from }}
    >
      <SettingsFormLayout>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                {organization.name}
              </CardTitle>
              <CardDescription>{m.family_settings_subtitle()}</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{m.family_settings_members_title()}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {memberships?.data?.map((mem) => {
                const isCurrentUser = mem.publicUserData?.userId === userId;
                return (
                  <div
                    key={mem.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {mem.publicUserData?.firstName}{" "}
                        {mem.publicUserData?.lastName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {mem.publicUserData?.identifier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {mem.role === "org:admin"
                          ? m.family_settings_members_role_admin()
                          : m.family_settings_members_role_member()}
                      </span>
                      {isAdmin && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            mem.publicUserData?.userId &&
                            handleRemoveMember(mem.publicUserData.userId)
                          }
                          aria-label={m.family_settings_members_remove()}
                        >
                          <Trash2 className="text-destructive size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {isAdmin && (
                <div className="mt-2 flex flex-col gap-2 border-t pt-2">
                  <label className="text-sm font-medium">
                    {m.family_settings_members_inviteEmail_label()}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      className="border-input bg-background placeholder:text-muted-foreground flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm"
                      placeholder={m.family_settings_members_inviteEmail_placeholder()}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleInvite();
                      }}
                    />
                    <Button
                      onClick={() => void handleInvite()}
                      disabled={isInviting || !inviteEmail.trim()}
                      size="sm"
                    >
                      <UserPlus className="mr-1 size-4" />
                      {isInviting
                        ? "..."
                        : m.family_settings_members_invite_submit()}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 pt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void handleLeave()}
              >
                <LogOut className="mr-2 size-4" />
                {m.family_settings_leave()}
              </Button>

              {isAdmin && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => void handleDelete()}
                >
                  <Trash2 className="mr-2 size-4" />
                  {m.family_settings_delete()}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </SettingsFormLayout>
    </SettingsLayout>
  );
}
