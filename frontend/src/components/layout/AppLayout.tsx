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
  LogOut,
  User,
  Cpu,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "@/lib/store/auth";
import { api } from "@/lib/api";

interface AppLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  leftPanelOverride?: React.ReactNode;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Assistant", href: "/assistant", icon: MessageSquare },
  { label: "Notebook", href: "/notebook", icon: BookOpen },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Reminders", href: "/reminders", icon: Bell },
  { label: "Research", href: "/research", icon: FlaskConical },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppLayout({ children, rightPanel, leftPanelOverride }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(!!rightPanel);
  const pathname = usePathname();
  const router = useRouter();
  const { clearTokens } = useAuthStore();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearTokens();
      router.push("/auth/login");
    }
  };

  const Sidebar = leftPanelOverride ? (
    <div className="h-full overflow-y-auto">{leftPanelOverride}</div>
  ) : (
    <DefaultSidebar
      collapsed={sidebarCollapsed}
      pathname={pathname}
      onLogout={handleLogout}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-navy">
      {/* Left sidebar */}
      <aside
        className={clsx(
          "flex flex-col h-full border-r border-white/10 bg-navy transition-all duration-200 flex-shrink-0",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 min-h-[64px]">
          <div className="w-8 h-8 rounded-lg bg-electric-blue flex items-center justify-center flex-shrink-0">
            <Cpu size={16} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-sora font-bold text-lg text-white">Jarvis</span>
          )}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="ml-auto text-gray-500 hover:text-white transition-colors"
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

        {/* User / logout */}
        <div className="border-t border-white/10 p-2">
          <button
            onClick={handleLogout}
            className={clsx(
              "nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-400/10",
              sidebarCollapsed && "justify-center px-0"
            )}
            title={sidebarCollapsed ? "Sign out" : undefined}
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Top bar + main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 py-3 border-b border-white/10 bg-navy/80 backdrop-blur min-h-[64px]">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="input-base w-full pl-9 py-1.5"
                placeholder="Search everything..."
                type="search"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <ModelSelector />
            <button className="relative btn-ghost p-2">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-accent rounded-full" />
            </button>
            <button className="w-8 h-8 rounded-full bg-electric-blue/20 flex items-center justify-center text-electric-blue hover:bg-electric-blue/30 transition-colors">
              <User size={16} />
            </button>
          </div>
        </header>

        {/* Content area */}
        <div className="flex flex-1 min-h-0">
          <main className="flex-1 min-w-0 overflow-hidden">{children}</main>

          {/* Right panel */}
          {rightPanel && rightPanelOpen && (
            <aside className="w-80 border-l border-white/10 overflow-y-auto flex-shrink-0">
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

function DefaultSidebar({ collapsed, pathname, onLogout }: any) {
  return null; // Rendered inline above
}

function ModelSelector() {
  return (
    <select className="bg-white/5 border border-white/10 text-sm text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-electric-blue">
      <option value="auto">Auto</option>
      <option value="claude-sonnet-4-6">Claude Sonnet</option>
      <option value="gpt-4o">GPT-4o</option>
      <option value="gemini-pro">Gemini Pro</option>
    </select>
  );
}
