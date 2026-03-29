import { requireSession } from "@/server/require-session";
import { Sidebar } from "@/components/shared/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
