"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/hooks/use-user";

let initialized = false;

function PostHogPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (initialized) {
      posthog.capture("$pageview");
    }
  }, [pathname]);

  return null;
}

function PostHogIdentify() {
  const { profile } = useUser();

  useEffect(() => {
    if (profile?.id && initialized) {
      posthog.identify(profile.id, {
        display_name: profile.display_name,
        twitter_verified: profile.twitter_verified,
        account_type: profile.account_type,
      });
    }
  }, [profile]);

  return null;
}

export function PostHogProviderWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || initialized) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: false, // We handle this manually
      capture_pageleave: true,
    });
    initialized = true;
  }, []);

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
