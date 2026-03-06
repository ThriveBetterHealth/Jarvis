"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Shield, Key, Bell, Cpu, Sun, Moon, Monitor,
  Users, UserPlus, Trash2, Mail, Check,
} from "lucide-react";
import { useThemeStore } from "@/lib/store/theme";
import toast from "react-hot-toast";

export function SettingsView() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  const isOwner = user?.role === "owner";

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto">
        <h1
          className="font-sora text-xl md:text-2xl font-semibold mb-6"
          style={{ color: "var(--text-1)" }}
        >
          Settings
        </h1>

        {/* Appearance */}
        <Section title="Appearance" icon={<Monitor size={16} />}>
          <AppearanceSection />
        </Section>

        {/* Profile */}
        <Section title="Profile" icon={<Cpu size={16} />}>
          <div className="space-y-3">
            <FieldRow label="Email" value={user?.email || "—"} />
            <FieldRow label="Name" value={user?.full_name || "—"} />
            <FieldRow
              label="Role"
              value={user?.role || "—"}
              valueClass="capitalize"
            />
          </div>
        </Section>

        {/* Security */}
        <Section title="Security" icon={<Shield size={16} />}>
          <div className="space-y-3">
            <FieldRow
              label="Multi-Factor Authentication"
              value={user?.mfa_enabled ? "Enabled" : "Disabled"}
              valueClass={user?.mfa_enabled ? "text-green-400" : "text-gray-500"}
              action={
                <button className="btn-secondary text-xs py-1">
                  {user?.mfa_enabled ? "Disable MFA" : "Enable MFA"}
                </button>
              }
            />
            <FieldRow
              label="Active Sessions"
              value="Current session"
              action={
                <button className="btn-secondary text-xs py-1 text-red-400 border-red-400/20 hover:bg-red-400/10">
                  Revoke all
                </button>
              }
            />
          </div>
        </Section>

        {/* AI Models */}
        <Section title="AI Models" icon={<Key size={16} />}>
          <div className="space-y-2">
            {[
              { name: "OpenAI (GPT-4o)", placeholder: "sk-..." },
              { name: "Anthropic (Claude)", placeholder: "sk-ant-..." },
              { name: "Google (Gemini)", placeholder: "AIza..." },
            ].map((model) => (
              <div key={model.name}>
                <label
                  className="block text-xs mb-1"
                  style={{ color: "var(--text-2)" }}
                >
                  {model.name}
                </label>
                <input
                  className="input-base w-full font-mono text-xs"
                  type="password"
                  placeholder={model.placeholder}
                />
              </div>
            ))}
            <button className="btn-primary text-sm mt-2">Save API Keys</button>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={<Bell size={16} />}>
          <NotificationsSection />
        </Section>

        {/* User Management — owner only */}
        {isOwner && (
          <Section title="User Management" icon={<Users size={16} />}>
            <UserManagement />
          </Section>
        )}
      </div>
    </div>
  );
}

/* ── Appearance ─────────────────────────────────────────────────────────── */
function AppearanceSection() {
  const { theme, setTheme } = useThemeStore();

  const options = [
    { value: "dark" as const, label: "Dark", icon: <Moon size={16} /> },
    { value: "light" as const, label: "Light", icon: <Sun size={16} /> },
  ];

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: "var(--text-2)" }}>
        Choose your preferred colour theme
      </p>
      <div className="flex gap-3">
        {options.map((opt) => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`
                flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all
                ${active
                  ? "border-electric-blue bg-electric-blue/10 text-electric-blue"
                  : "border-white/10 hover:border-white/20"
                }
              `}
              style={{ color: active ? undefined : "var(--text-2)" }}
            >
              {opt.icon}
              <span className="text-sm font-medium">{opt.label}</span>
              {active && (
                <span className="w-4 h-4 rounded-full bg-electric-blue flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Notifications toggles ───────────────────────────────────────────────── */
function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    desktop: true,
    email: true,
    inApp: true,
  });

  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const items: { key: keyof typeof prefs; label: string }[] = [
    { key: "desktop", label: "Desktop notifications" },
    { key: "email", label: "Email alerts" },
    { key: "inApp", label: "In-app badges" },
  ];

  return (
    <div className="space-y-2">
      {items.map(({ key, label }) => (
        <label
          key={key}
          className="flex items-center justify-between py-1 cursor-pointer"
        >
          <span className="text-sm" style={{ color: "var(--text-2)" }}>
            {label}
          </span>
          <button
            role="switch"
            aria-checked={prefs[key]}
            onClick={() => toggle(key)}
            className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${
              prefs[key] ? "bg-electric-blue" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                prefs[key] ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      ))}
    </div>
  );
}

/* ── User Management (owner only) ────────────────────────────────────────── */
function UserManagement() {
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "read_only">("user");
  const [showInvite, setShowInvite] = useState(false);

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/auth/users")).data,
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: { email: string; role: string }) =>
      (await api.post("/auth/users/invite", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setInviteEmail("");
      setShowInvite(false);
      toast.success("Invitation sent");
    },
    onError: () => toast.error("Failed to send invitation"),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) =>
      (await api.delete(`/auth/users/${userId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User removed");
    },
    onError: () => toast.error("Failed to remove user"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--text-2)" }}>
          Manage who has access to Jarvis AI
        </p>
        <button
          onClick={() => setShowInvite((v) => !v)}
          className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
        >
          <UserPlus size={13} />
          Invite user
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div
          className="rounded-xl p-4 space-y-3 border"
          style={{ background: "var(--surface-2)", borderColor: "var(--border-c)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
            Invite a new user
          </p>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-2)" }}>
              Email address
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="input-base w-full pl-9"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-2)" }}>
              Role
            </label>
            <select
              className="input-base w-full"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "user" | "read_only")}
            >
              <option value="user">User — can create and edit</option>
              <option value="read_only">Read-only — view only</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInvite(false)}
              className="btn-secondary flex-1 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                inviteMutation.mutate({ email: inviteEmail, role: inviteRole })
              }
              disabled={!inviteEmail || inviteMutation.isPending}
              className="btn-primary flex-1 text-sm"
            >
              {inviteMutation.isPending ? "Sending…" : "Send invite"}
            </button>
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--text-2)" }}>
            Loading…
          </p>
        ) : users.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--text-2)" }}>
            No other users yet
          </p>
        ) : (
          users.map((u: any) => (
            <div
              key={u.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border-c)" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                  {u.full_name || u.email}
                </p>
                <p className="text-xs capitalize" style={{ color: "var(--text-2)" }}>
                  {u.email} · {u.role}
                </p>
              </div>
              {u.role !== "owner" && (
                <button
                  onClick={() => {
                    if (confirm(`Remove ${u.email}?`)) deactivateMutation.mutate(u.id);
                  }}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Remove user"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Shared helpers ───────────────────────────────────────────────────────── */
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="card mb-4"
      style={{ background: "var(--surface)", borderColor: "var(--border-c)" }}
    >
      <div
        className="flex items-center gap-2 mb-4 pb-3 border-b"
        style={{ borderColor: "var(--border-c)" }}
      >
        <span className="text-electric-blue">{icon}</span>
        <h3 className="font-sora font-semibold text-sm" style={{ color: "var(--text-1)" }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function FieldRow({
  label,
  value,
  valueClass,
  action,
}: {
  label: string;
  value: string;
  valueClass?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm" style={{ color: "var(--text-2)" }}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span
          className={`text-sm ${valueClass || ""}`}
          style={valueClass ? undefined : { color: "var(--text-1)" }}
        >
          {value}
        </span>
        {action}
      </div>
    </div>
  );
}
