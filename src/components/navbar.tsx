'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Plus, LogOut, Settings, Bell } from 'lucide-react';
import { useState } from 'react';
import { PostIntentDialog } from '@/components/post-intent-dialog';
import { useUser } from '@/lib/hooks/use-user';

export function Navbar() {
  const { login, logout, ready, authenticated } = usePrivy();
  const { user, profile } = useUser();
  const [intentDialogOpen, setIntentDialogOpen] = useState(false);
  const isVerified = profile?.twitter_verified as boolean | undefined;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080810]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-110">
            M
          </div>
          <span className="text-base font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
            Manifest
          </span>
        </Link>

        {/* Center nav */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link href="/feed" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Explore
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {!ready ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-white/5" />
          ) : authenticated ? (
            <>
              <Button
                size="sm"
                onClick={() => setIntentDialogOpen(true)}
                className="hidden gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white sm:flex transition-all shadow-lg shadow-emerald-500/20"
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
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white transition-colors">
                  <Bell className="h-5 w-5" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <button className="rounded-full focus:outline-none ring-offset-0 focus:ring-1 focus:ring-emerald-500/50">
                    <Avatar className="h-8 w-8 ring-1 ring-white/10 hover:ring-white/30 transition-all">
                      <AvatarImage src={user?.twitter?.profilePictureUrl ?? ''} />
                      <AvatarFallback className="bg-zinc-800 text-xs text-zinc-300">
                        {(user?.twitter?.username ?? user?.email?.address ?? 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#0e0e14] border-white/[0.08]">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.twitter?.name ?? user?.email?.address ?? 'User'}
                    </p>
                    {user?.twitter?.username && (
                      <p className="text-xs text-zinc-500 truncate">@{user.twitter.username}</p>
                    )}
                  </div>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem onClick={() => window.location.href='/settings'} className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                    <Settings className="h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => login()}
              className="bg-white text-black hover:bg-zinc-100 font-medium transition-all"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

      <PostIntentDialog
        open={intentDialogOpen}
        onOpenChange={setIntentDialogOpen}
        twitterVerified={!!isVerified}
        userId={user?.id ?? ''}
      />
    </nav>
  );
}
