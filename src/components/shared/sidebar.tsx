"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  ChartPie,
  PlusCircle,
  Gear,
  Sparkle,
  SignOut,
} from "@phosphor-icons/react/dist/ssr";
import { signOut } from "@/lib/auth-client";

const menuItems = [
  { icon: SquaresFour, label: "Portfolio", path: "/overview" },
  { icon: ChartPie, label: "Assets", path: "/assets" },
  { icon: Sparkle, label: "Advisor", path: "/advisor" },
  { icon: PlusCircle, label: "Add Asset", path: "/add-asset" },
  { icon: Gear, label: "Settings", path: "/settings" },
];

interface SidebarProps {
  userName: string;
  userEmail: string;
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <aside className="h-screen w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="h-20 px-8 flex items-center">
        <h1 className="text-xl font-bold text-white tracking-wide font-[family-name:var(--font-display)] select-none">
          NextWorth
        </h1>
      </div>

      {/* Navigation */}
      <nav aria-label="Main" className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.path ||
            (item.path !== "/overview" && pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 active:scale-[0.98] ${
                isActive
                  ? "bg-primary text-neutral-900 shadow-lg shadow-white/10"
                  : "text-neutral-400"
              }`}
            >
              <Icon
                size={20}
                weight={isActive ? "fill" : "regular"}
                className={isActive ? "text-neutral-900" : "text-neutral-400"}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="p-4 border-t border-neutral-800">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50">
          <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-neutral-400 to-neutral-600 flex items-center justify-center text-white font-semibold select-none">
            {userName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userName}
            </p>
            <p className="text-xs text-neutral-400 truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            type="button"
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 p-2 -mr-1 rounded-lg text-neutral-400 transition-colors hover:text-red-400 hover:bg-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
          >
            <SignOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
