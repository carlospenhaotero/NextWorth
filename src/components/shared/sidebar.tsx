"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  ChartPie,
  PlusCircle,
  MagnifyingGlass,
  Gear,
  SignOut,
} from "@phosphor-icons/react/dist/ssr";
import { signOut } from "@/lib/auth-client";

const menuItems = [
  { icon: SquaresFour, label: "Portfolio", path: "/overview" },
  { icon: ChartPie, label: "Assets", path: "/assets" },
  { icon: PlusCircle, label: "Add Asset", path: "/add-asset" },
  { icon: MagnifyingGlass, label: "Search Assets", path: "/search-assets" },
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
    <div className="h-screen w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-bold text-lg">N</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-wide font-[family-name:var(--font-display)]">
          NextWorth
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.path ||
            (item.path !== "/overview" && pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-primary text-neutral-900 shadow-lg shadow-white/20"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <Icon
                size={20}
                className={
                  isActive
                    ? "text-neutral-900"
                    : "text-neutral-400 group-hover:text-white"
                }
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="p-4 border-t border-neutral-800">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neutral-400 to-neutral-600 flex items-center justify-center text-white font-bold">
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
            className="text-neutral-400 hover:text-red-400 transition-colors"
          >
            <SignOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
