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
      <main className="flex-1 ml-0 lg:ml-64 px-5 pb-10 pt-24 sm:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
