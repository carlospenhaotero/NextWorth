"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  SquaresFour,
  ChartPie,
  PlusCircle,
  Gear,
  Sparkle,
  SignOut,
  List,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { signOut } from "@/lib/auth-client";

const menuItems = [
  { icon: SquaresFour, key: "portfolio", path: "/overview" },
  { icon: ChartPie, key: "assets", path: "/assets" },
  { icon: Sparkle, key: "advisor", path: "/advisor" },
  { icon: PlusCircle, key: "addAsset", path: "/add-asset" },
  { icon: Gear, key: "settings", path: "/settings" },
] as const;

interface SidebarProps {
  userName: string;
  userEmail: string;
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  // Close drawer on route change (safety net alongside per-link handlers)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape to close, focus management and body scroll lock while the drawer is open
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-neutral-900 border-b border-neutral-800 flex items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("openMenu")}
          className="p-2 -ml-2 rounded-lg text-neutral-300 transition-colors hover:text-white hover:bg-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
        >
          <List size={24} />
        </button>
        <Link
          href="/overview"
          aria-label={t("brandHome")}
          className="rounded-lg outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 active:scale-[0.98]"
        >
          <span className="text-lg font-bold text-white tracking-wide font-[family-name:var(--font-display)] select-none">
            NextWorth
          </span>
        </Link>
      </header>

      {/* Mobile backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar (desktop) / drawer (mobile) */}
      <aside
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? t("mainMenu") : undefined}
        className={`h-screen w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-20 px-8 flex items-center justify-between">
          <Link
            href="/overview"
            aria-label={t("brandHome")}
            onClick={() => setOpen(false)}
            className="rounded-lg outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 active:scale-[0.98]"
          >
            <h1 className="text-xl font-bold text-white tracking-wide font-[family-name:var(--font-display)] select-none">
              NextWorth
            </h1>
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("closeMenu")}
            className="lg:hidden p-2 -mr-2 rounded-lg text-neutral-400 transition-colors hover:text-white hover:bg-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
          >
            <X size={20} />
          </button>
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
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 active:scale-[0.98] ${
                  isActive
                    ? "bg-accent text-accent-foreground shadow-lg shadow-accent/25"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <Icon
                  size={20}
                  weight={isActive ? "fill" : "regular"}
                  className={isActive ? "text-accent-foreground" : "text-current"}
                />
                <span>{t(item.key)}</span>
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
              aria-label={t("signOut")}
              title={t("signOut")}
              className="shrink-0 p-2 -mr-1 rounded-lg text-neutral-400 transition-colors hover:text-red-400 hover:bg-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
            >
              <SignOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
