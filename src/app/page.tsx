'use client';

import { useUser } from '@/lib/hooks/use-user';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { INTENT_TYPE_CONFIG } from '@/lib/types/database';
import type { IntentType } from '@/lib/types/database';
import { ArrowRight, Shield, Search, Handshake, ExternalLink, CheckCircle } from 'lucide-react';
import { ManifestMark } from '@/components/manifest-mark';

const STEPS = [
  { icon: Shield, title: 'Verify with X', desc: 'Sign in and link your X account. X verification keeps the feed high-signal.', num: '01' },
  { icon: Search, title: 'Declare your intent', desc: 'Post what you\u2019re looking for: partnerships, investment, hiring, integrations, and more.', num: '02' },
  { icon: Handshake, title: 'Connect and build', desc: 'Receive requests, accept the right ones, and get the other party\u2019s contact details instantly.', num: '03' },
];

const INTENT_TYPES: IntentType[] = [
  'partnership', 'investment', 'integration', 'hiring',
  'co-marketing', 'grant', 'ecosystem-support', 'beta-testers',
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function HomePage() {
  const { isAuthenticated: authenticated, isLoading } = useUser();
  const ready = !isLoading;
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace('/feed');
    }
  }, [ready, authenticated, router]);

  if (!ready || authenticated) {
    return <main className="min-h-screen bg-surface-page" />;
  }

  return (
    <main className="min-h-screen bg-surface-page">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 animate-gradient-mesh bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(139,92,246,0.15),transparent_50%),radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(16,185,129,0.1),transparent_50%),radial-gradient(ellipse_40%_30%_at_20%_80%,rgba(139,92,246,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-surface-page/40" />

        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:py-32">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
            >
              <span className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-400 mb-8">
                <CheckCircle className="size-3 mr-1.5" />
                Built for Web3
              </span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.08] max-w-4xl">
              {['Declare', 'what', "you're", 'building', 'toward'].map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease }}
                  className="inline-block mr-[0.3em] text-text-heading"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6, ease }}
              className="mt-6 text-base sm:text-lg text-text-body max-w-2xl leading-relaxed"
            >
              Manifest is where Web3 builders, protocols, and investors post their intentions — and find the people to make them real.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.75, ease }}
              className="flex flex-col sm:flex-row items-center gap-3 mt-10"
            >
              <Link
                href="/feed"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-7 py-3.5 text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] shadow-lg shadow-emerald-500/20 cursor-pointer w-full sm:w-auto"
              >
                Browse Intents
                <ArrowRight className="size-4 ml-2" />
              </Link>
              {ready && !authenticated && (
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-xl border border-violet-500/30 hover:border-violet-500/50 text-violet-300 hover:text-violet-200 font-medium px-7 py-3.5 text-base transition-all duration-200 hover:bg-violet-500/5 cursor-pointer w-full sm:w-auto"
                >
                  Post Intent
                </Link>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="text-2xl sm:text-3xl font-bold text-text-heading text-center mb-16"
        >
          How it works
        </motion.h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.04, ease }}
              className="relative flex flex-col items-center text-center group"
            >
              <div className="relative mb-5">
                <span className="absolute -top-2 -right-2 text-xs font-bold text-violet-400/60">{step.num}</span>
                <div className="size-16 rounded-2xl bg-surface-secondary border border-white/8 flex items-center justify-center group-hover:border-violet-500/30 group-hover:bg-violet-500/5 transition-all duration-200">
                  <step.icon className="size-7 text-violet-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-heading mb-2">{step.title}</h3>
              <p className="text-sm text-text-body leading-relaxed max-w-xs">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Intent type showcase */}
      <section className="border-t border-white/8 bg-white/3">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-text-heading mb-4">
              Every kind of intent
            </h2>
            <p className="text-sm text-text-body max-w-lg mx-auto">
              Whether you&apos;re raising a round, looking for a co-marketing partner, or hiring your next engineer — there&apos;s an intent type for it.
            </p>
          </motion.div>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {INTENT_TYPES.map((type, i) => {
              const config = INTENT_TYPE_CONFIG[type];
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04, ease }}
                  className="shrink-0 snap-start rounded-xl border border-white/8 bg-surface-secondary p-4 w-56 hover:border-white/12 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                >
                  <div className={`flex items-center gap-2 mb-2 ${config.color.split(' ')[1] ?? ''}`}>
                    <span className="size-2 rounded-full bg-current" />
                    <span className="text-xs font-medium">
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{config.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-y border-white/8 bg-white/3">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <p className="text-center text-xs sm:text-sm text-text-muted tracking-wide">
            Verified via <span className="text-text-body">X</span> · Built on <span className="text-text-body">Base</span> · <span className="text-text-body">Open source</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/8">
        <div className="mx-auto max-w-5xl px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ManifestMark size={24} mode="primary" className="text-white/90" />
            <span className="text-xs text-text-muted">Manifest · 2025</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/feed" className="text-xs text-text-muted hover:text-text-body transition-colors duration-200 cursor-pointer">
              Feed
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-body transition-colors duration-200 cursor-pointer flex items-center gap-1 text-xs">
              GitHub <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
