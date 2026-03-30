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
import { getUserApiKey, generateApiKey, getUserWebhooks, createWebhook, deleteWebhook } from '@/app/actions/api-keys';
import { CheckCircle, Copy, ExternalLink, LogOut, Key, Webhook, Trash2, Plus } from 'lucide-react';
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

  // Developer state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyInfo, setApiKeyInfo] = useState<{ id: string; name: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [webhooks, setWebhooks] = useState<{ id: string; url: string; events: string[]; created_at: string }[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['intent.created']);
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setTelegram(profile.telegram_handle ?? '');
      setEmail(profile.email ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (user?.userId) {
      getUserApiKey(user.userId).then((k) => {
        if (k) setApiKeyInfo(k);
      });
      getUserWebhooks(user.userId).then(setWebhooks);
    }
  }, [user?.userId]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(profile.id, {
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
      <main className="min-h-[calc(100vh-4rem)] bg-[#080810]">
        <div className="mx-auto max-w-lg px-4 py-8">
          <div className="h-8 w-32 rounded bg-white/[0.06] animate-pulse mb-8" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[#0e0e14] animate-pulse border border-white/[0.08]" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">Sign in to access settings.</p>
        </div>
      </main>
    );
  }

  const walletAddress = profile.wallet_address;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#080810]">
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-white/90 mb-8">Settings</h1>

        {/* Profile */}
        <section className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-5 mb-6">
          <h2 className="text-base font-medium text-white/90 mb-4">Profile</h2>
          <div className="space-y-4">
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
        <section className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-5 mb-6">
          <h2 className="text-base font-medium text-white/90 mb-4">Connected Accounts</h2>
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
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
          <section className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-5 mb-6">
            <h2 className="text-base font-medium text-white/90 mb-4">My Wallet</h2>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
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

        {/* Developer */}
        <section className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-5 mb-6">
          <h2 className="text-base font-medium text-white/90 mb-4 flex items-center gap-2">
            <Key className="size-4 text-violet-400" />
            Developer
          </h2>

          {/* API Key */}
          <div className="mb-5">
            <Label className="text-zinc-300 text-sm">API Key</Label>
            {apiKeyInfo && !apiKey ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-zinc-400 font-mono bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 flex-1">
                  ••••••••••••••••
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { key } = await generateApiKey(profile.id);
                    setApiKey(key);
                    setShowKey(true);
                    toast.success('New API key generated');
                  }}
                  className="border-white/10 text-zinc-300"
                >
                  Regenerate
                </Button>
              </div>
            ) : apiKey ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-mono bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 flex-1 truncate">
                    {showKey ? apiKey : '••••••••••••••••'}
                  </span>
                  <button onClick={() => setShowKey(!showKey)} className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer">
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('Copied'); }} className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                    <Copy className="size-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-amber-400 mt-1.5">Save this key — it won&apos;t be shown again.</p>
              </div>
            ) : (
              <div className="mt-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    const { key } = await generateApiKey(profile.id);
                    setApiKey(key);
                    setShowKey(true);
                    toast.success('API key generated');
                  }}
                  className="bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"
                >
                  <Key className="size-3.5 mr-1.5" />
                  Generate API Key
                </Button>
              </div>
            )}
          </div>

          {/* Webhooks */}
          <div>
            <Label className="text-zinc-300 text-sm flex items-center gap-1.5">
              <Webhook className="size-3.5 text-emerald-400" />
              Webhooks
            </Label>

            {/* Existing webhooks */}
            {webhooks.length > 0 && (
              <div className="space-y-2 mt-3 mb-4">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 font-mono truncate">{wh.url}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{wh.events.join(', ')}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await deleteWebhook(profile.id, wh.id);
                        setWebhooks((prev) => prev.filter((w) => w.id !== wh.id));
                        toast.success('Webhook deleted');
                      }}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create webhook form */}
            <div className="mt-3 space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="bg-white/5 border-white/10 text-sm"
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webhookEvents.includes('intent.created')}
                    onChange={(e) => {
                      setWebhookEvents((prev) =>
                        e.target.checked
                          ? [...prev, 'intent.created']
                          : prev.filter((ev) => ev !== 'intent.created')
                      );
                    }}
                    className="rounded border-white/20"
                  />
                  intent.created
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webhookEvents.includes('connection.accepted')}
                    onChange={(e) => {
                      setWebhookEvents((prev) =>
                        e.target.checked
                          ? [...prev, 'connection.accepted']
                          : prev.filter((ev) => ev !== 'connection.accepted')
                      );
                    }}
                    className="rounded border-white/20"
                  />
                  connection.accepted
                </label>
              </div>
              <Button
                size="sm"
                disabled={!webhookUrl || creatingWebhook}
                onClick={async () => {
                  setCreatingWebhook(true);
                  try {
                    const wh = await createWebhook(profile.id, webhookUrl, webhookEvents);
                    setWebhooks((prev) => [wh, ...prev]);
                    setWebhookUrl('');
                    toast.success('Webhook created. Secret: ' + wh.secret);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Failed');
                  } finally {
                    setCreatingWebhook(false);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                <Plus className="size-3.5 mr-1" />
                {creatingWebhook ? 'Creating...' : 'Add Webhook'}
              </Button>
            </div>
          </div>
        </section>

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
