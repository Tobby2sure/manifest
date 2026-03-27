"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/lib/hooks/use-user";
import { Plus, User, LogOut, Settings, Bell } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { PostIntentDialog } from "@/components/post-intent-dialog";
import { getUnreadCount } from "@/app/actions/notifications";

export function Navbar() {
  const hasPrivy = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!hasPrivy) {
    return (
      <nav className="border-b border-white/[0.08] bg-[#080810]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/feed" className="text-lg font-bold tracking-tight text-white/90">
            Manifest
          </Link>
        </div>
      </nav>
    );
  }

  return <NavbarWithAuth />;
}

function NavbarWithAuth() {
  const { login, logout, ready, authenticated } = usePrivy();
  const { profile } = useUser();
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const canPost = authenticated && profile?.twitter_verified;

  const fetchUnread = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const count = await getUnreadCount(profile.id);
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <>
      <nav className="border-b border-white/[0.08] bg-[#080810]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Left: Brand */}
          <Link
            href="/feed"
            className="text-lg font-bold tracking-tight text-white/90"
          >
            <span className="text-emerald-400">M</span>anifest
          </Link>

          {/* Center: Feed link */}
          <Link
            href="/feed"
            className="hidden sm:block text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Feed
          </Link>

          {/* Right: Auth */}
          <div className="flex items-center gap-2.5">
            {!ready ? null : !authenticated ? (
              <Button
                onClick={login}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
              >
                Sign In
              </Button>
            ) : (
              <>
                {canPost && (
                  <Button
                    onClick={() => setPostDialogOpen(true)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                  >
                    <Plus className="size-3.5 mr-1" />
                    Post Intent
                  </Button>
                )}

                {/* Notification bell */}
                <Link href="/notifications" className="relative">
                  <button className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
                    <Bell className="size-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                        <Avatar size="sm">
                          {profile?.avatar_url ? (
                            <AvatarImage
                              src={profile.avatar_url}
                              alt={profile.display_name ?? ""}
                            />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end" sideOffset={8}>
                    {profile && (
                      <>
                        <div className="px-1.5 py-1">
                          <p className="text-sm font-medium">
                            {profile.display_name ?? "Anonymous"}
                          </p>
                          {profile.twitter_handle && (
                            <p className="text-xs text-muted-foreground">
                              @{profile.twitter_handle}
                            </p>
                          )}
                        </div>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      render={
                        <Link
                          href={
                            profile
                              ? `/profile/${profile.id}`
                              : "/onboarding"
                          }
                        >
                          <User className="size-4 mr-2" />
                          Profile
                        </Link>
                      }
                    />
                    <DropdownMenuItem
                      render={
                        <Link href="/onboarding">
                          <Settings className="size-4 mr-2" />
                          Settings
                        </Link>
                      }
                    />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="size-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </nav>

      {profile && (
        <PostIntentDialog
          open={postDialogOpen}
          onOpenChange={setPostDialogOpen}
          userId={profile.id}
          twitterVerified={profile.twitter_verified}
        />
      )}
    </>
  );
}
