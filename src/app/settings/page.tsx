'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUser } from '@/lib/hooks/use-user';
import { updateProfile } from '@/app/actions/profiles';
import { uploadAvatar, removeAvatar } from '@/app/actions/avatar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, Copy, ExternalLink, LogOut, Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const { handleLogOut } = useDynamicContext();
  const { user, profile, isLoading } = useUser();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [telegram, setTelegram] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setTelegram(profile.telegram_handle ?? '');
      setEmail(profile.email ?? '');
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large — max 2 MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { url } = await uploadAvatar(formData);
      setAvatarUrl(url);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingAvatar(false);
      // Reset the file input so the same file can be re-selected
      e.target.value = '';
    }
  }

  async function handleAvatarRemove() {
    setUploadingAvatar(true);
    try {
      await removeAvatar();
      setAvatarUrl(null);
      toast.success('Avatar removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName || undefined,
        bio: bio || undefined,
        telegram_handle: telegram || undefined,
        email: email || undefined,
      });
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="mx-auto max-w-lg px-4 py-8">
          <div className="h-8 w-32 rounded bg-white/6 animate-pulse mb-8" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-card animate-pulse border border-white/8" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">Sign in to access settings.</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Complete onboarding to access settings.</p>
          <Button onClick={() => router.push('/onboarding')}>Go to Onboarding</Button>
        </div>
      </main>
    );
  }

  const walletAddress = profile.wallet_address;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-white/90 mb-8">Settings</h1>

        {/* Profile */}
        <section className="rounded-xl border border-white/8 bg-card p-5 mb-6">
          <h2 className="text-base font-medium text-white/90 mb-4">Profile</h2>
          <div className="space-y-4">
            {/* Avatar */}
            <div>
              <Label className="text-zinc-300">Profile Picture</Label>
              <div className="mt-2 flex items-center gap-4">
                <Avatar className="size-16 ring-2 ring-white/8">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-zinc-800 text-zinc-400">
                    {(displayName || 'U')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <label className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors ${uploadingAvatar ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="size-3.5" />
                        {avatarUrl ? 'Change' : 'Upload'}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarSelect}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                  {avatarUrl && !uploadingAvatar && (
                    <button
                      onClick={handleAvatarRemove}
                      disabled={uploadingAvatar}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 mt-2">JPEG, PNG, WebP, or GIF. Max 2 MB.</p>
            </div>
            <div>
              <Label className="text-zinc-300" htmlFor="s-name">Display Name</Label>
              <Input
                id="s-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="mt-1.5 bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label className="text-zinc-300" htmlFor="s-bio">Bio</Label>
              <Textarea
                id="s-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What are you building?"
                className="mt-1.5 bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label className="text-zinc-300" htmlFor="s-tg">Telegram Handle</Label>
              <Input
                id="s-tg"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="your_handle"
                className="mt-1.5 bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label className="text-zinc-300" htmlFor="s-email">Email</Label>
              <Input
                id="s-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 bg-white/5 border-white/10"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </section>

        {/* Connected Accounts */}
        <section className="rounded-xl border border-white/8 bg-card p-5 mb-6">
          <h2 className="text-base font-medium text-white/90 mb-4">Connected Accounts</h2>
          <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 p-4">
            {profile.twitter_verified ? (
              <>
                {profile.avatar_url && (
                  <img src={profile.avatar_url} alt="" className="size-10 rounded-full" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white/90">X (Twitter)</span>
                    <CheckCircle className="size-3.5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-zinc-400">@{profile.twitter_handle}</span>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Connected</span>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <span className="text-sm text-zinc-400">X (Twitter)</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/onboarding/verify-x')}
                >
                  Connect
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Wallet */}
        {walletAddress && (
          <section className="rounded-xl border border-white/8 bg-card p-5 mb-6">
            <h2 className="text-base font-medium text-white/90 mb-4">My Wallet</h2>
            <div className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/3 p-4">
              <span className="text-sm text-zinc-300 font-mono truncate flex-1">
                {walletAddress}
              </span>
              <button
                onClick={() => copyToClipboard(walletAddress)}
                className="shrink-0 p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <Copy className="size-4" />
              </button>
              <a
                href={`https://basescan.org/address/${walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
          </section>
        )}

        {/* Danger Zone */}
        <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <h2 className="text-base font-medium text-red-400 mb-4">Danger Zone</h2>
          <Button
            variant="outline"
            onClick={async () => {
              await handleLogOut();
            }}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="size-4 mr-2" />
            Sign Out
          </Button>
        </section>
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';
