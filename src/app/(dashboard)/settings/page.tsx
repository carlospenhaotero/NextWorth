import { requireSession } from "@/server/require-session";
import { getUserProfile } from "@/queries/user";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage() {
  const session = await requireSession();
  const profile = await getUserProfile(session.user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Customize your NextWorth experience</p>
      </header>

      <SettingsForm currentCurrency={profile?.baseCurrency || "USD"} />
    </div>
  );
}
