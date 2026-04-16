"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { upsertProfile } from "@/app/actions/profiles";
import type { AccountType } from "@/lib/types/database";
import { useUser } from "@/lib/hooks/use-user";
import { useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";
import { CheckCircle, ArrowRight, ArrowLeft, User, Building2, Link2 } from "lucide-react";

const STEP_LABELS = ["Account Type", "Your Details", "Organization"];
const ease = [0.22, 1, 0.36, 1] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated: authenticated, user, profile } = useUser();
  const { setShowAuthFlow, primaryWallet } = useDynamicContext();
  const posthog = usePostHog();
  const queryClient = useQueryClient();

  // Redirect existing users who already completed onboarding
  useEffect(() => {
    if (!isLoading && authenticated && profile?.display_name) {
      router.replace("/feed");
    }
  }, [isLoading, authenticated, profile, router]);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [accountType, setAccountType] = useState<AccountType>(
    profile?.account_type ?? "individual"
  );
  const [displayName, setDisplayName] = useState(
    profile?.display_name ?? ""
  );
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [telegram, setTelegram] = useState(
    profile?.telegram_handle ?? ""
  );
  const [email, setEmail] = useState(profile?.email ?? "");
  const [orgName, setOrgName] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isOrg = accountType === "organization";
  const totalSteps = isOrg ? 4 : 3;

  const twitterCredential = user?.verifiedCredentials?.find(c => c.oauthProvider === 'twitter');
  const hasTwitter = !!twitterCredential?.oauthUsername;
  const twitterUsername = twitterCredential?.oauthUsername;

  function currentStepIndex() {
    if (step === 0) return 0;
    if (step === 1) return 1;
    if (step === 2 && isOrg) return 2;
    return isOrg ? 3 : 2;
  }

  function nextStep() {
    setDirection(1);
    posthog?.capture("onboarding_step_completed", { step: currentStepIndex() });
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      if (!displayName.trim()) {
        setError("Display name is required.");
        return;
      }
      setError("");
      setStep(isOrg ? 2 : 3);
    } else if (step === 2) {
      setStep(3);
    }
  }

  function prevStep() {
    setDirection(-1);
    if (step === 3) {
      setStep(isOrg ? 2 : 1);
    } else if (step === 2) {
      setStep(1);
    } else if (step === 1) {
      setStep(0);
    }
  }

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    setError("");

    try {
      const walletAddress = primaryWallet?.address ?? undefined;
      await upsertProfile({
        id: user.userId!,
        display_name: displayName,
        bio: bio || undefined,
        telegram_handle: telegram || undefined,
        email: email || undefined,
        account_type: accountType,
        twitter_handle: twitterUsername ?? undefined,
        twitter_verified: hasTwitter,
        wallet_address: walletAddress,
      });
      // Invalidate profile query so ProfileGuard sees the new profile
      await queryClient.invalidateQueries({ queryKey: ['user-profile', user.userId] });
      router.push("/onboarding/verify-x");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  }

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface-page flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-6 shadow-lg shadow-violet-500/20">
            M
          </div>
          <h1 className="text-2xl font-bold text-text-heading mb-2">
            Welcome to Manifest
          </h1>
          <p className="text-text-body mb-8">
            Sign in to declare your intents and connect with the Web3 ecosystem.
          </p>
          <button
            onClick={() => setShowAuthFlow(true)}
            className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-violet-500/20 cursor-pointer"
          >
            Sign In to Continue
          </button>
          <p className="text-text-muted text-xs mt-4">Email, X (Twitter), or wallet</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface-page flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <motion.div
                animate={{
                  scale: i === currentStepIndex() ? 1 : 0.75,
                  backgroundColor: i <= currentStepIndex() ? "rgb(139, 92, 246)" : "rgba(255,255,255,0.1)",
                }}
                transition={{ duration: 0.3, ease }}
                className="size-2.5 rounded-full"
              />
              {i < totalSteps - 1 && (
                <motion.div
                  animate={{
                    backgroundColor: i < currentStepIndex() ? "rgb(139, 92, 246)" : "rgba(255,255,255,0.07)",
                  }}
                  transition={{ duration: 0.3, ease }}
                  className="w-8 h-0.5 rounded-full"
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/8 bg-surface-secondary p-6 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 0: Account Type */}
            {step === 0 && (
              <motion.div
                key="step0"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease }}
              >
                <h2 className="text-xl font-bold text-text-heading mb-1">
                  Welcome to Manifest
                </h2>
                <p className="text-sm text-text-body mb-6">
                  Choose your account type to get started.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAccountType("individual")}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-all duration-200 cursor-pointer ${
                      accountType === "individual"
                        ? "border-violet-500/50 bg-violet-500/10"
                        : "border-white/8 hover:border-white/20"
                    }`}
                  >
                    <User
                      className={`size-8 ${accountType === "individual" ? "text-violet-400" : "text-text-body"}`}
                    />
                    <span
                      className={`text-sm font-medium ${accountType === "individual" ? "text-violet-400" : "text-text-body"}`}
                    >
                      Individual
                    </span>
                  </button>
                  <button
                    onClick={() => setAccountType("organization")}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-all duration-200 cursor-pointer ${
                      accountType === "organization"
                        ? "border-violet-500/50 bg-violet-500/10"
                        : "border-white/8 hover:border-white/20"
                    }`}
                  >
                    <Building2
                      className={`size-8 ${accountType === "organization" ? "text-violet-400" : "text-text-body"}`}
                    />
                    <span
                      className={`text-sm font-medium ${accountType === "organization" ? "text-violet-400" : "text-text-body"}`}
                    >
                      Organization
                    </span>
                  </button>
                </div>
                <Button
                  onClick={nextStep}
                  className="w-full mt-6 bg-violet-600 hover:bg-violet-500 text-white border-0 transition-all duration-200 active:scale-[0.97] cursor-pointer"
                >
                  Continue
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </motion.div>
            )}

            {/* Step 1: Details */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease }}
              >
                <h2 className="text-xl font-bold text-text-heading mb-1">
                  Your Details
                </h2>
                <p className="text-sm text-text-body mb-6">
                  Tell us about yourself.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-text-body" htmlFor="displayName">
                      Display Name *
                    </Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="mt-1.5 bg-white/5 border-white/8 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <Label className="text-text-body" htmlFor="bio">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="What are you building?"
                      className="mt-1.5 bg-white/5 border-white/8 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <Label className="text-text-body" htmlFor="telegram">
                      Telegram Handle
                    </Label>
                    <Input
                      id="telegram"
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      placeholder="your_handle"
                      className="mt-1.5 bg-white/5 border-white/8 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <Label className="text-text-body" htmlFor="email">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1.5 bg-white/5 border-white/8 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={prevStep} className="flex-1 cursor-pointer transition-all duration-200 active:scale-[0.97]">
                    <ArrowLeft className="size-4 mr-1.5" />
                    Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 text-white border-0 transition-all duration-200 active:scale-[0.97] cursor-pointer"
                  >
                    Continue
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Org (only if organization) */}
            {step === 2 && isOrg && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease }}
              >
                <h2 className="text-xl font-bold text-text-heading mb-1">
                  Organization Details
                </h2>
                <p className="text-sm text-text-body mb-6">
                  Tell us about your organization.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-text-body" htmlFor="orgName">
                      Organization Name
                    </Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Acme Protocol"
                      className="mt-1.5 bg-white/5 border-white/8 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <Label className="text-text-body" htmlFor="orgWebsite">
                      Website
                    </Label>
                    <Input
                      id="orgWebsite"
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                      placeholder="https://acme.xyz"
                      className="mt-1.5 bg-white/5 border-white/8 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <Label className="text-text-body" htmlFor="orgLogo">
                      Logo URL
                    </Label>
                    <Input
                      id="orgLogo"
                      value={orgLogo}
                      onChange={(e) => setOrgLogo(e.target.value)}
                      placeholder="https://acme.xyz/logo.png"
                      className="mt-1.5 bg-white/5 border-white/8 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={prevStep} className="flex-1 cursor-pointer transition-all duration-200 active:scale-[0.97]">
                    <ArrowLeft className="size-4 mr-1.5" />
                    Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 text-white border-0 transition-all duration-200 active:scale-[0.97] cursor-pointer"
                  >
                    Continue
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Connect X */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease }}
              >
                <h2 className="text-xl font-bold text-text-heading mb-1">
                  Connect X (Twitter)
                </h2>
                <p className="text-sm text-text-body mb-6">
                  Link your X account to post intents. This verifies your identity.
                </p>

                {hasTwitter ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <CheckCircle className="size-6 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-400">
                        X Connected
                      </p>
                      <p className="text-xs text-text-body">
                        @{twitterUsername}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowAuthFlow(true)}
                    variant="outline"
                    className="w-full border-white/8 hover:border-violet-500/30 transition-all duration-200 cursor-pointer"
                  >
                    <Link2 className="size-4 mr-2" />
                    Connect X Account
                  </Button>
                )}

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={prevStep} className="flex-1 cursor-pointer transition-all duration-200 active:scale-[0.97]">
                    <ArrowLeft className="size-4 mr-1.5" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0 transition-all duration-200 active:scale-[0.97] cursor-pointer"
                  >
                    {submitting ? "Saving..." : "Complete Setup"}
                  </Button>
                </div>
                <button
                  onClick={async () => {
                    // Skip X — save profile and go to feed directly
                    if (!user) return;
                    setSubmitting(true);
                    try {
                      await upsertProfile({
                        id: user.userId!,
                        display_name: displayName,
                        bio: bio || undefined,
                        telegram_handle: telegram || undefined,
                        email: email || undefined,
                        account_type: accountType,
                        twitter_verified: false,
                        wallet_address: primaryWallet?.address ?? undefined,
                      });
                      // Invalidate profile query so ProfileGuard sees the new profile
                      await queryClient.invalidateQueries({ queryKey: ['user-profile', user.userId] });
                      router.push("/feed");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to save profile");
                    }
                    finally { setSubmitting(false); }
                  }}
                  className="w-full mt-2 text-sm text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer"
                >
                  Skip X verification for now →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && step === 3 && (
          <p className="text-sm text-red-400 text-center mt-3">{error}</p>
        )}
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';
