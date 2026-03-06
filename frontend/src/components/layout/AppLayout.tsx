"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  CheckSquare,
  Bell,
  Search as SearchIcon,
  FlaskConical,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { clsx } from "clsx";
import { NotificationsRail } from "./NotificationsRail";
import { ProfileMenu } from "./ProfileMenu";

interface AppLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  leftPanelOverride?: React.ReactNode;
}

const NAV_ITEMS = [
  { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
  { label: "Assistant",  href: "/assistant",  icon: MessageSquare },
  { label: "Notebook",   href: "/notebook",   icon: BookOpen },
  { label: "Tasks",      href: "/tasks",      icon: CheckSquare },
  { label: "Research",   href: "/research",   icon: FlaskConical },
  { label: "Settings",   href: "/settings",   icon: Settings },
];

export function AppLayout({ children, rightPanel, leftPanelOverride }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <>
      {/* ── Desktop layout ─────────────────────────────────────────────── */}
      <div
        className="hidden md:flex h-screen overflow-hidden"
        style={{ background: "var(--bg)" }}
      >
        {/* Left sidebar */}
        <aside
          className={clsx(
            "flex flex-col h-full border-r flex-shrink-0 transition-all duration-200",
          )}
          style={{
            width: sidebarCollapsed ? 64 : 240,
            background: "var(--surface)",
            borderColor: "var(--border-c)",
          }}
        >
          {/* Logo */}
          <div
            className="flex items-center gap-3 px-4 py-4 border-b min-h-[64px]"
            style={{ borderColor: "var(--border-c)" }}
          >
            <div className="w-8 h-8 rounded-lg bg-electric-blue flex items-center justify-center flex-shrink-0">
              <Cpu size={16} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-sora font-bold text-lg" style={{ color: "var(--text-1)" }}>
                Jarvis
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="ml-auto hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-2)" }}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={clsx(
                  "nav-item w-full",
                  pathname.startsWith(href) && "active",
                  sidebarCollapsed && "justify-center px-0"
                )}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>{label}</span>}
              </button>
            ))}
          </nav>

          {/* Profile at bottom of sidebar */}
          <div
            className="border-t p-3"
            style={{ borderColor: "var(--border-c)" }}
          >
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <ProfileMenu />
              </div>
            ) : (
              <ProfileMenu />
            )}
          </div>
        </aside>

        {/* Top bar + main content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Top bar */}
          <header
            className="flex items-center gap-4 px-4 py-3 border-b min-h-[64px] backdrop-blur"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-c)",
            }}
          >
            <div className="flex-1 max-w-md">
              <div className="relative">
                <SearchIcon
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-2)" }}
                />
                <input
                  className="input-base w-full pl-9 py-1.5"
                  placeholder="Search everything…"
                  type="search"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <ModelSelector />

              {/* Bell */}
              <button
                onClick={() => setNotifOpen(true)}
                className="relative btn-ghost p-2"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {/* Unread dot */}
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-accent rounded-full" />
              </button>
            </div>
          </header>

          {/* Content area */}
          <div className="flex flex-1 min-h-0">
            <main className="flex-1 min-w-0 overflow-hidden">{children}</main>

            {/* Right panel */}
            {rightPanel && (
              <aside
                className="w-80 border-l overflow-y-auto flex-shrink-0"
                style={{ borderColor: "var(--border-c)" }}
              >
                {rightPanel}
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile layout ──────────────────────────────────────────────── */}
      <div
        className="flex md:hidden flex-col h-screen overflow-hidden"
        style={{ background: "var(--bg)" }}
      >
        {/* Mobile top bar */}
        <header
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ background: "var(--surface)", borderColor: "var(--border-c)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-electric-blue flex items-center justify-center">
              <Cpu size={14} className="text-white" />
            </div>
            <span className="font-sora font-bold text-base" style={{ color: "var(--text-1)" }}>
              Jarvis
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile search icon */}
            <button className="btn-ghost p-2" aria-label="Search">
              <SearchIcon size={18} />
            </button>

            {/* Bell */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative btn-ghost p-2"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-accent rounded-full" />
            </button>

            {/* Profile */}
            <ProfileMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="flex items-center justify-around border-t flex-shrink-0 safe-area-bottom"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-c)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 flex-1 transition-colors"
                style={{ color: active ? "var(--color-electric-blue)" : "var(--text-2)" }}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium truncate w-full text-center">
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-electric-blue" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Notifications rail (shared) ─────────────────────────────────── */}
      <NotificationsRail open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}

function ModelSelector() {
  return (
    <select
      className="text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-electric-blue border"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--border-c)",
        color: "var(--text-2)",
      }}
    >
      <option value="auto">Auto</option>
      <option value="claude-sonnet-4-6">Claude Sonnet</option>
      <option value="gpt-4o">GPT-4o</option>
      <option value="gemini-pro">Gemini Pro</option>
    </select>
  );
}
