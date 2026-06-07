import { requireSession } from "@/server/require-session";
import { getUserProfile } from "@/queries/user";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage() {
  const session = await requireSession();
  const profile = await getUserProfile(session.user.id);

  return (
    <div className="space-y-6">
      <SettingsForm currentCurrency={profile?.baseCurrency || "USD"} />
    </div>
  );
}
