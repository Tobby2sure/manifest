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
import { Plus, LogOut, Settings, Bell, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PostIntentDialog } from '@/components/post-intent-dialog';
import { useUser } from '@/lib/hooks/use-user';

export function Navbar() {
  const { login, logout, ready, authenticated } = usePrivy();
  const { user, profile } = useUser();
  const [intentDialogOpen, setIntentDialogOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isVerified = profile?.twitter_verified as boolean | undefined;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav className={`sticky top-0 z-50 border-b transition-all duration-200 ${
        scrolled
          ? 'border-white/[0.08] bg-[#0a0a12]/80 backdrop-blur-xl shadow-lg shadow-black/10'
          : 'border-transparent bg-transparent'
      }`}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-transform duration-200 group-hover:scale-110">
              M
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 opacity-40 blur-md -z-10" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#F1F5F9] group-hover:text-white transition-colors duration-200">
              Manifest
            </span>
          </Link>

          {/* Center nav */}
          <div className="hidden items-center gap-6 sm:flex">
            <Link href="/feed" className="text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">
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
                  className="hidden gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white sm:flex transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.97] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Post Intent
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIntentDialogOpen(true)}
                  className="flex sm:hidden text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer">
                    <Bell className="h-5 w-5" />
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <button className="rounded-full focus:outline-none ring-offset-0 focus:ring-1 focus:ring-violet-500/50 cursor-pointer">
                      <Avatar className="h-8 w-8 ring-1 ring-white/10 hover:ring-violet-500/40 transition-all duration-200">
                        <AvatarImage src={user?.twitter?.profilePictureUrl ?? ''} />
                        <AvatarFallback className="bg-[#0f0f1a] text-xs text-[#94A3B8]">
                          {(user?.twitter?.username ?? user?.email?.address ?? 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-[#0f0f1a] border-white/[0.08]">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-[#F1F5F9] truncate">
                        {user?.twitter?.name ?? user?.email?.address ?? 'User'}
                      </p>
                      {user?.twitter?.username && (
                        <p className="text-xs text-[#475569] truncate">@{user.twitter.username}</p>
                      )}
                    </div>
                    <DropdownMenuSeparator className="bg-white/[0.08]" />
                    <DropdownMenuItem onClick={() => window.location.href='/settings'} className="flex items-center gap-2 cursor-pointer text-[#94A3B8] hover:text-white">
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

                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="sm:hidden text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => login()}
                className="bg-white text-black hover:bg-zinc-100 font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileOpen && authenticated && (
          <div className="sm:hidden border-t border-white/[0.07] bg-[#0a0a12]/95 backdrop-blur-xl animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              <Link
                href="/feed"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors duration-200 cursor-pointer"
              >
                Explore
              </Link>
              <Link
                href="/notifications"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors duration-200 cursor-pointer"
              >
                Notifications
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors duration-200 cursor-pointer"
              >
                Settings
              </Link>
            </div>
          </div>
        )}
      </nav>

      <PostIntentDialog
        open={intentDialogOpen}
        onOpenChange={setIntentDialogOpen}
        twitterVerified={!!isVerified}
        userId={user?.id ?? ''}
      />
    </>
  );
}
