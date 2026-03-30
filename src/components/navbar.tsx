'use client';

import Link from 'next/link';
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Plus, LogOut, Settings, Bell, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PostIntentDialog } from '@/components/post-intent-dialog';
import { useUser } from '@/lib/hooks/use-user';

export function Navbar() {
  const { sdkHasLoaded, user: dynamicUser, handleLogOut, setShowAuthFlow } = useDynamicContext();
  const { user, twitterHandle, twitterVerified } = useUser();
  const isLoggedIn = !!dynamicUser || !!user;
  const [intentDialogOpen, setIntentDialogOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const displayName = twitterHandle
    ? `@${twitterHandle}`
    : (user?.verifiedCredentials?.find((c: any) => c.oauthProvider === 'email')?.oauthUsername ?? dynamicUser?.email ?? 'User');

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-white/[0.08] bg-[#0a0a12]/90 backdrop-blur-xl' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-transform group-hover:scale-110">
            M
          </div>
          <span className="text-base font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
            Manifest
          </span>
        </Link>

        {/* Center */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link href="/feed" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Explore
          </Link>
          <Link href="/events" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Events
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {!sdkHasLoaded ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-white/5" />
          ) : isLoggedIn ? (
            <>
              <Button
                size="sm"
                onClick={() => setIntentDialogOpen(true)}
                className="hidden gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white sm:flex transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Plus className="h-4 w-4" />Post Intent
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIntentDialogOpen(true)} className="flex sm:hidden text-zinc-400 hover:text-white cursor-pointer">
                <Plus className="h-5 w-5" />
              </Button>
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                  <Bell className="h-5 w-5" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <button className="rounded-full focus:outline-none cursor-pointer">
                    <Avatar className="h-8 w-8 ring-1 ring-white/10 hover:ring-white/30 transition-all">
                      <AvatarFallback className="bg-zinc-800 text-xs text-zinc-300">
                        {displayName[0]?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#0e0e14] border-white/[0.08]">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white truncate">{displayName}</p>
                    {twitterVerified && <p className="text-xs text-emerald-400 mt-0.5">✓ X Verified</p>}
                  </div>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem onClick={() => window.location.href = '/profile/me'} className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                    <User className="h-4 w-4" />My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/settings'} className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                    <Settings className="h-4 w-4" />Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem onClick={() => handleLogOut()} className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300">
                    <LogOut className="h-4 w-4" />Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <DynamicWidget
              innerButtonComponent={
                <span className="bg-white text-black hover:bg-zinc-100 font-medium px-3 py-1.5 rounded-md text-sm transition-all cursor-pointer">
                  Sign In
                </span>
              }
            />
          )}
        </div>
      </div>

      <PostIntentDialog
        open={intentDialogOpen}
        onOpenChange={setIntentDialogOpen}
        twitterVerified={twitterVerified}
        userId={user?.userId ?? ''}
      />
    </nav>
  );
}
