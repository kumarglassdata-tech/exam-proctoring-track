"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirects to /login if no access_token is found in localStorage.
 * Returns { token, user } if authenticated.
 */
export function useAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem("access_token");
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  return { token, user };
}
