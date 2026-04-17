"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/use-user";
import { PageLoader } from "@/components/page-loader";

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
    <main className="min-h-screen bg-surface-page">
      <PageLoader />
    </main>
  );
}
