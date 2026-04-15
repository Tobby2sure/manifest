"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/use-user";

export default function MyProfilePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useUser();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/onboarding");
      return;
    }
    if (user?.userId) {
      router.replace(`/profile/${user.userId}`);
    }
  }, [user, isLoading, isAuthenticated, router]);

  return (
    <main className="min-h-screen bg-surface-page flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </main>
  );
}
