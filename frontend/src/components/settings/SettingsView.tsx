"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Settings, Shield, Key, Bell, Cpu } from "lucide-react";

export function SettingsView() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data;
    },
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-sora text-2xl font-semibold mb-6">Settings</h1>

        {/* Profile */}
        <Section title="Profile" icon={<Cpu size={16} />}>
          <div className="space-y-3">
            <FieldRow label="Email" value={user?.email || "—"} />
            <FieldRow label="Name" value={user?.full_name || "—"} />
            <FieldRow label="Role" value={user?.role || "—"} />
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
                <label className="block text-xs text-gray-400 mb-1">{model.name}</label>
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
          <div className="space-y-2 text-sm text-gray-400">
            {[
              { label: "Desktop notifications", checked: true },
              { label: "Email alerts", checked: true },
              { label: "In-app badges", checked: true },
            ].map(({ label, checked }) => (
              <label key={label} className="flex items-center justify-between py-1 cursor-pointer">
                <span>{label}</span>
                <div
                  className={`w-9 h-5 rounded-full relative transition-colors ${
                    checked ? "bg-electric-blue" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      checked ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </label>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card mb-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
        <span className="text-electric-blue">{icon}</span>
        <h3 className="font-sora font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value, valueClass, action }: { label: string; value: string; valueClass?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className={`text-sm ${valueClass || "text-white"}`}>{value}</span>
        {action}
      </div>
    </div>
  );
}
