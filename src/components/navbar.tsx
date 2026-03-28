"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, User, LogOut, Settings, Bell } from "lucide-react";
import { useState } from "react";
import { PostIntentDialog } from "@/components/post-intent-dialog";

export function Navbar() {
  const { data: session, status } = useSession();
  const [intentDialogOpen, setIntentDialogOpen] = useState(false);

  const isAuthenticated = !!session?.user;
  const isLoading = status === 'loading';
  const user = session?.user as { name?: string; image?: string; username?: string } | undefined;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080810]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-black">
            M
          </div>
          <span className="text-base font-bold tracking-tight text-white/90">Manifest</span>
        </Link>

        {/* Nav links */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link href="/feed" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Explore
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-white/5" />
          ) : isAuthenticated ? (
            <>
              {/* Post intent button */}
              <Button
                size="sm"
                onClick={() => setIntentDialogOpen(true)}
                className="hidden gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white sm:flex"
              >
                <Plus className="h-4 w-4" />
                Post Intent
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIntentDialogOpen(true)}
                className="flex sm:hidden text-zinc-400 hover:text-white"
              >
                <Plus className="h-5 w-5" />
              </Button>

              {/* Notifications */}
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white">
                  <Bell className="h-5 w-5" />
                </Button>
              </Link>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none">
                    <Avatar className="h-8 w-8 ring-1 ring-white/10 hover:ring-white/30 transition-all">
                      <AvatarImage src={user?.image ?? ''} />
                      <AvatarFallback className="bg-zinc-800 text-xs">
                        {user?.name?.[0]?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 bg-[#0e0e14] border-white/[0.08]"
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                    <p className="text-xs text-zinc-500 truncate">@{user?.username}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem
                    onClick={() => window.location.href = '/settings'}
                    className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => signIn('twitter')}
              className="bg-white text-black hover:bg-zinc-100 font-medium"
            >
              Sign in with X
            </Button>
          )}
        </div>
      </div>

      <PostIntentDialog
        open={intentDialogOpen}
        onOpenChange={setIntentDialogOpen}
        userId={(session?.user as { id?: string })?.id ?? ''}
        twitterVerified={isAuthenticated}
      />
    </nav>
  );
}
