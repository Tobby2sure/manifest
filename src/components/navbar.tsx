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
import { Plus, LogOut, Settings, Bell, User, CheckCheck, MessageSquare, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { getNotifications } from '@/app/actions/notifications';
import { getMyPrimaryOrg } from '@/app/org/[slug]/actions';
import type { Notification } from '@/lib/types/database';
import { formatDistanceToNow } from 'date-fns';
import { PostIntentDialog } from '@/components/post-intent-dialog';
import { ManifestMark } from '@/components/manifest-mark';
import { useUser } from '@/lib/hooks/use-user';

export function Navbar() {
  const { sdkHasLoaded, user: dynamicUser, handleLogOut, setShowAuthFlow } = useDynamicContext();
  const { user, profile, twitterHandle, twitterVerified } = useUser();
  const isLoggedIn = !!dynamicUser || !!user;
  const [intentDialogOpen, setIntentDialogOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [myOrg, setMyOrg] = useState<{ id: string; slug: string; name: string; role: string } | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    if (!user?.userId) return;
    getNotifications(user.userId)
      .then(data => setNotifications(data.slice(0, 5)))
      .catch(() => {});

    // Fetch primary org for the dropdown "My Organization" link
    getMyPrimaryOrg()
      .then(setMyOrg)
      .catch(() => setMyOrg(null));
  }, [user?.userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [notifOpen]);

  const displayName = twitterHandle
    ? `@${twitterHandle}`
    : (user?.verifiedCredentials?.find((c) => c.format === 'email')?.email ?? dynamicUser?.email ?? 'User');

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-white/8 bg-surface-page/90 backdrop-blur-xl' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <ManifestMark
            size={32}
            mode="primary"
            className="text-white/90 transition-transform group-hover:scale-110"
          />
          <span className="text-base font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
            Manifest
          </span>
        </Link>

        {/* Center */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link href="/feed" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Explore
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
              <Button size="icon" variant="ghost" onClick={() => setIntentDialogOpen(true)} aria-label="Post intent" className="flex sm:hidden text-zinc-400 hover:text-white cursor-pointer">
                <Plus className="h-5 w-5" />
              </Button>
              {/* Notification bell with click preview */}
              <div className="relative" ref={notifRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                  className="relative text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  onClick={() => setNotifOpen(!notifOpen)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
                {/* Click preview panel */}
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/8 bg-card shadow-2xl shadow-black/50 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                      <span className="text-sm font-semibold text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-xs text-violet-400">{unreadCount} unread</span>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      <div>
                        {notifications.slice(0, 4).map(n => (
                          <Link
                            key={n.id}
                            href="/notifications"
                            onClick={() => setNotifOpen(false)}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-white/4 hover:bg-white/6 transition-colors cursor-pointer ${!n.read ? 'bg-violet-500/[0.04]' : ''}`}
                          >
                            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${!n.read ? 'bg-violet-500/20' : 'bg-white/5'}`}>
                              {n.type === 'connection_request' && <MessageSquare className="size-3.5 text-blue-400" />}
                              {n.type === 'request_accepted' && <CheckCircle className="size-3.5 text-emerald-400" />}
                              {n.type === 'request_declined' && <XCircle className="size-3.5 text-red-400" />}
                              {!['connection_request','request_accepted','request_declined'].includes(n.type) && <Bell className="size-3.5 text-violet-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-zinc-300 leading-relaxed">
                                {(n.payload as { message?: string })?.message ?? n.type.replace(/_/g, ' ')}
                              </p>
                              <p className="text-[10px] text-zinc-600 mt-0.5">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            {!n.read && <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />}
                          </Link>
                        ))}
                        <Link href="/notifications" onClick={() => setNotifOpen(false)} className="block px-4 py-2.5 text-center text-xs text-violet-400 hover:text-violet-300 transition-colors">
                          More
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <button className="rounded-full focus:outline-none cursor-pointer">
                    <Avatar className="h-8 w-8 ring-1 ring-white/10 hover:ring-white/30 transition-all">
                      {profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt={displayName} />
                      ) : null}
                      <AvatarFallback className="bg-zinc-800 text-xs text-zinc-300">
                        {displayName[0]?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-white/8">
                  {/* Identity card: avatar + name + email/handle + verified */}
                  <div className="flex items-center gap-3 px-3 py-3">
                    <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/10">
                      {profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt={displayName} />
                      ) : null}
                      <AvatarFallback className="bg-zinc-800 text-xs text-zinc-300">
                        {displayName[0]?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {profile?.display_name ?? displayName}
                      </p>
                      {twitterHandle ? (
                        <p className="text-xs text-zinc-400 truncate">@{twitterHandle}</p>
                      ) : (
                        <p className="text-xs text-zinc-400 truncate">{displayName}</p>
                      )}
                      {twitterVerified && (
                        <p className="text-[10px] text-emerald-400 mt-0.5">✓ X Verified</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-white/8" />
                  {/* For org accounts, the org page IS the profile — skip "My Profile" */}
                  {profile?.account_type !== 'organization' && (
                    <DropdownMenuItem onClick={() => window.location.href = '/profile/me'} className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                      <User className="h-4 w-4" />My Profile
                    </DropdownMenuItem>
                  )}
                  {myOrg && (
                    <DropdownMenuItem onClick={() => window.location.href = `/org/${myOrg.slug}`} className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                      <Building2 className="h-4 w-4" />My Organization
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => window.location.href = '/settings'} className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white">
                    <Settings className="h-4 w-4" />Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/8" />
                  <DropdownMenuItem onClick={() => handleLogOut()} className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-white">
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
