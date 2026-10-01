"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ConditionalSidebar() {
  const pathname = usePathname();
  // Hide sidebar on /login
  if (pathname === "/login") return null;
  return <Sidebar />;
}
