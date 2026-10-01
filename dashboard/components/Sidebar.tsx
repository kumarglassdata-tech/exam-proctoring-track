"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield, BookOpen, Users, Video, FileText,
  LogOut, Plus, BarChart3,
} from "lucide-react";

interface StoredUser {
  name?: string;
  email?: string;
  role?: string;
}

const NAV = [
  { label: "Exams & Questions", href: "/recruiter/exams", icon: BookOpen },
  { label: "Create New Exam", href: "/recruiter/exams/new", icon: Plus },
  { label: "Live Monitoring", href: "/proctor/live", icon: Video },
  { label: "Candidate Results", href: "/recruiter/results", icon: BarChart3 },
  { label: "Integrity Reports", href: "/proctor/reports", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StoredUser>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : (user.role?.slice(0, 2).toUpperCase() ?? "?");

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0d0f17] flex flex-col h-screen shrink-0">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-tight">ExamGuard</h1>
          <p className="text-xs text-white/40">Operations Hub</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/recruiter/exams"
              ? pathname === href          // exact match so /exams/new doesn't double-highlight
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 font-bold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">{user.name ?? "User"}</div>
              <div className="text-[10px] text-white/40 capitalize truncate">{user.role ?? "recruiter"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-white/30 hover:text-red-400 p-1.5 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
