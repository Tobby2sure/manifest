'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { INTENT_TYPE_CONFIG } from '@/lib/types/database';
import type { IntentType } from '@/lib/types/database';
import { ArrowRight, Handshake, Search, Shield } from 'lucide-react';

const MOCK_CARDS = [
  { type: 'partnership' as IntentType, content: 'Looking for a DeFi protocol to co-build a cross-chain lending product on Base.', priority: 'Active' },
  { type: 'investment' as IntentType, content: 'Raising seed round for our ZK-powered identity verification layer on Ethereum.', priority: 'Urgent' },
  { type: 'integration' as IntentType, content: 'Seeking oracle integration for our prediction market — Chainlink or Pyth preferred.', priority: 'Open' },
];

const STEPS = [
  { icon: Shield, title: 'Verify with X', desc: 'Sign in and link your X account. X verification keeps the feed high-signal.' },
  { icon: Search, title: 'Declare your intent', desc: 'Post what you\u2019re looking for: partnerships, investment, hiring, integrations, and more.' },
  { icon: Handshake, title: 'Connect and build', desc: 'Receive requests, accept the right ones, and get the other party\u2019s contact details instantly.' },
];

const INTENT_TYPES: IntentType[] = [
  'partnership', 'investment', 'integration', 'hiring',
  'co-marketing', 'grant', 'ecosystem-support', 'beta-testers',
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const authenticated = !!session?.user;
  const ready = status !== 'loading';

  return (
    <main className="min-h-screen bg-[#080810]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
        <div className="mx-auto max-w-5xl px-4 pt-20 pb-16 sm:pt-28 sm:pb-24 relative">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 mb-6">
              🌐 Built for Web3
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] max-w-3xl">
              Declare what you&apos;re building toward
            </h1>
            <p className="mt-5 text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
              Manifest is where Web3 builders, protocols, and investors post their intentions — and find the people to make them real.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
              <Link
                href="/feed"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 text-base transition-colors w-full sm:w-auto"
              >
                Browse Intents
                <ArrowRight className="size-4 ml-2" />
              </Link>
              {ready && !authenticated && (
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white font-medium px-6 py-3 text-base transition-colors w-full sm:w-auto"
                >
                  Post Your Intent
                </Link>
              )}
              {ready && authenticated && (
                <Link
                  href="/feed"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white font-medium px-6 py-3 text-base transition-colors w-full sm:w-auto"
                >
                  Go to Feed
                </Link>
              )}
            </div>
          </div>

          {/* Floating mock cards */}
          <div className="mt-16 grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            {MOCK_CARDS.map((card, i) => {
              const config = INTENT_TYPE_CONFIG[card.type];
              return (
                <div
                  key={i}
                  className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-4 hover:border-white/[0.15] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      card.priority === 'Urgent' ? 'text-red-400 bg-red-500/20' :
                      card.priority === 'Active' ? 'text-amber-400 bg-amber-500/20' :
                      'text-emerald-400 bg-emerald-500/20'
                    }`}>
                      {card.priority}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{card.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <div className="border-y border-white/[0.06] bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <p className="text-center text-xs sm:text-sm text-zinc-500 tracking-wide">
            Trusted by builders on <span className="text-zinc-400">Ethereum</span> · <span className="text-zinc-400">Arbitrum</span> · <span className="text-zinc-400">Base</span> · <span className="text-zinc-400">Solana</span> · <span className="text-zinc-400">Cosmos</span>
          </p>
        </div>
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">
          How it works
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <step.icon className="size-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Intent type showcase */}
      <section className="border-t border-white/[0.06] bg-white/[0.01]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-4">
            Every kind of intent
          </h2>
          <p className="text-sm text-zinc-400 text-center mb-10 max-w-lg mx-auto">
            Whether you&apos;re raising a round, looking for a co-marketing partner, or hiring your next engineer — there&apos;s an intent type for it.
          </p>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {INTENT_TYPES.map((type) => {
              const config = INTENT_TYPE_CONFIG[type];
              return (
                <div
                  key={type}
                  className="shrink-0 snap-start rounded-xl border border-white/[0.08] bg-[#0e0e14] p-4 w-56"
                >
                  <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${config.color} mb-2`}>
                    {config.label}
                  </span>
                  <p className="text-xs text-zinc-400 leading-relaxed">{config.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            Manifest · Built for Web3 · © 2025
          </p>
          <div className="flex items-center gap-4">
            <Link href="/feed" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Feed
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
