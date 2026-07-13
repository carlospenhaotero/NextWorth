import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/server/require-session";
import { getUserProfile } from "@/queries/user";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { DataSourcesCard } from "@/components/dashboard/data-sources-card";
import { PageHeader } from "@/components/ui/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.settings");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function SettingsPage() {
  const session = await requireSession();
  const profile = await getUserProfile(session.user.id);
  const t = await getTranslations("metadata.settings");

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("description")} />
      <div className="flex flex-col gap-6">
        <SettingsForm
          currentCurrency={profile?.baseCurrency || "USD"}
          currentName={profile?.name || ""}
        />
        <DataSourcesCard />
      </div>
    </>
  );
}
