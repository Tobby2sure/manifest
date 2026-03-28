'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { INTENT_TYPE_CONFIG } from '@/lib/types/database';
import type { IntentType } from '@/lib/types/database';
import { ArrowRight, Shield, Search, Handshake, ExternalLink, CheckCircle } from 'lucide-react';

const STEPS = [
  { icon: Shield, title: 'Verify with X', desc: 'Sign in and link your X account. X verification keeps the feed high-signal.', num: '01' },
  { icon: Search, title: 'Declare your intent', desc: 'Post what you\u2019re looking for: partnerships, investment, hiring, integrations, and more.', num: '02' },
  { icon: Handshake, title: 'Connect and build', desc: 'Receive requests, accept the right ones, and get the other party\u2019s contact details instantly.', num: '03' },
];

const INTENT_TYPES: IntentType[] = [
  'partnership', 'investment', 'integration', 'hiring',
  'co-marketing', 'grant', 'ecosystem-support', 'beta-testers',
];

const STATS = [
  { value: 500, suffix: '+', label: 'intents' },
  { value: 200, suffix: '+', label: 'builders' },
  { value: 12, suffix: '', label: 'ecosystems' },
];

const ease = [0.22, 1, 0.36, 1] as const;

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const duration = 1500;
    const start = performance.now();
    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function HomePage() {
  const { ready, authenticated } = usePrivy();

  return (
    <main className="min-h-screen bg-[#0a0a12]">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 animate-gradient-mesh bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(139,92,246,0.15),transparent_50%),radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(16,185,129,0.1),transparent_50%),radial-gradient(ellipse_40%_30%_at_20%_80%,rgba(139,92,246,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[#0a0a12]/40" />

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
                  className="inline-block mr-[0.3em] text-[#F1F5F9]"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6, ease }}
              className="mt-6 text-base sm:text-lg text-[#94A3B8] max-w-2xl leading-relaxed"
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
              {ready && authenticated && (
                <Link
                  href="/feed"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 hover:border-white/20 text-[#94A3B8] hover:text-white font-medium px-7 py-3.5 text-base transition-all duration-200 cursor-pointer w-full sm:w-auto"
                >
                  Go to Feed
                </Link>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Animated stat strip */}
      <div className="border-y border-white/[0.07] bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex items-center justify-center gap-8 sm:gap-16 text-center">
            {STATS.map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-[#F1F5F9]">
                  <CountUp target={stat.value} suffix={stat.suffix} />
                </span>
                <span className="text-sm text-[#475569]">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="text-2xl sm:text-3xl font-bold text-[#F1F5F9] text-center mb-16"
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
                <div className="size-16 rounded-2xl bg-[#0f0f1a] border border-white/[0.07] flex items-center justify-center group-hover:border-violet-500/30 group-hover:bg-violet-500/5 transition-all duration-200">
                  <step.icon className="size-7 text-violet-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">{step.title}</h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed max-w-xs">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Intent type showcase */}
      <section className="border-t border-white/[0.07] bg-white/[0.01]">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F1F5F9] mb-4">
              Every kind of intent
            </h2>
            <p className="text-sm text-[#94A3B8] max-w-lg mx-auto">
              Whether you&apos;re raising a round, looking for a co-marketing partner, or hiring your next engineer — there&apos;s an intent type for it.
            </p>
          </motion.div>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {INTENT_TYPES.map((type, i) => {
              const config = INTENT_TYPE_CONFIG[type];
              const dotColor = config.color.replace(/bg-(\w+)-500\/20.*/, '$1');
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04, ease }}
                  className="shrink-0 snap-start rounded-xl border border-white/[0.07] bg-[#0f0f1a] p-4 w-56 hover:border-white/[0.12] hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`size-2 rounded-full ${config.color.split(' ')[0].replace('/20', '')}`} />
                    <span className={`text-xs font-medium ${config.color.split(' ')[1]}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">{config.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-y border-white/[0.07] bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <p className="text-center text-xs sm:text-sm text-[#475569] tracking-wide">
            Verified via <span className="text-[#94A3B8]">X</span> · Built on <span className="text-[#94A3B8]">Base</span> · <span className="text-[#94A3B8]">Open source</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto max-w-5xl px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
              M
            </div>
            <span className="text-xs text-[#475569]">Manifest · 2025</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/feed" className="text-xs text-[#475569] hover:text-[#94A3B8] transition-colors duration-200 cursor-pointer">
              Feed
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[#475569] hover:text-[#94A3B8] transition-colors duration-200 cursor-pointer flex items-center gap-1 text-xs">
              GitHub <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
