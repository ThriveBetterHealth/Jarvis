"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import {
  User, Settings, LogOut, Camera, X, Save, Moon, Sun,
  Shield, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import { useThemeStore } from "@/lib/store/theme";
import toast from "react-hot-toast";

export function ProfileMenu() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen]       = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const router  = useRouter();
  const { clearTokens } = useAuthStore();
  const { theme, toggle: toggleTheme } = useThemeStore();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } finally {
      clearTokens();
      router.push("/auth/login");
    }
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="relative" ref={dropRef}>
      {/* Avatar button */}
      <button
        onClick={() => setDropdownOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity"
      >
        <div className="w-8 h-8 rounded-full bg-electric-blue/20 border border-electric-blue/40 flex items-center justify-center text-electric-blue text-xs font-bold select-none">
          {user?.avatar_url
            ? <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
            : initials
          }
        </div>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute right-0 top-10 w-52 rounded-xl shadow-xl z-50 py-1 overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border-c)" }}
        >
          {/* User info */}
          <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border-c)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{user?.full_name || "—"}</p>
            <p className="text-xs truncate" style={{ color: "var(--text-2)" }}>{user?.email || "—"}</p>
          </div>

          <MenuItem icon={<User size={14} />} label="Profile settings"
            onClick={() => { setModalOpen(true); setDropdownOpen(false); }} />
          <MenuItem icon={<Settings size={14} />} label="App settings"
            onClick={() => { router.push("/settings"); setDropdownOpen(false); }} />

          {/* Theme toggle */}
          <button
            onClick={() => { toggleTheme(); setDropdownOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
            style={{ color: "var(--text-2)" }}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          <div className="border-t my-1" style={{ borderColor: "var(--border-c)" }} />

          <MenuItem icon={<LogOut size={14} />} label="Sign out"
            onClick={handleLogout} className="text-red-400 hover:bg-red-400/10" />
        </div>
      )}

      {/* Profile Settings Modal */}
      {modalOpen && <ProfileModal user={user} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function MenuItem({ icon, label, onClick, className }: {
  icon: React.ReactNode; label: string; onClick: () => void; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5",
        className
      )}
      style={{ color: className ? undefined : "var(--text-2)" }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ProfileModal({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName]       = useState(user?.full_name || "");
  const [email, setEmail]     = useState(user?.email || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateMutation = useMutation({
    mutationFn: async (data: { full_name: string }) => {
      const res = await api.patch("/auth/me", data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile updated");
      onClose();
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const initials = name
    ? name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border-c)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-c)" }}>
          <h2 className="font-sora font-semibold text-base" style={{ color: "var(--text-1)" }}>Profile Settings</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-electric-blue/20 border-2 border-electric-blue/40 flex items-center justify-center text-electric-blue text-xl font-bold overflow-hidden">
                {avatarPreview
                  ? <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                  : initials
                }
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-electric-blue flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
              >
                <Camera size={13} className="text-white" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--text-2)" }}>PNG, JPG or WebP · max 2 MB</p>
          </div>

          {/* Fields */}
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-2)" }}>Full name</label>
            <input
              className="input-base w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "var(--text-2)" }}>Email address</label>
            <input
              className="input-base w-full opacity-60"
              value={email}
              disabled
              title="Email cannot be changed here"
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-2)" }}>Contact support to change your email</p>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
            <Shield size={14} className="text-electric-blue flex-shrink-0" />
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-1)" }}>Role: {user?.role || "owner"}</p>
              <p className="text-xs" style={{ color: "var(--text-2)" }}>MFA: {user?.mfa_enabled ? "Enabled ✓" : "Disabled"}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--border-c)" }}>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => updateMutation.mutate({ full_name: name })}
            disabled={updateMutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Save size={14} />
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
