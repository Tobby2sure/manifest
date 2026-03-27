"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { upsertProfile } from "@/app/actions/profiles";
import type { AccountType } from "@/lib/types/database";
import { useUser } from "@/lib/hooks/use-user";
import { CheckCircle, ArrowRight, ArrowLeft, User, Building2, Link2 } from "lucide-react";

const STEPS = ["Account Type", "Your Details", "Organization", "Connect X"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, linkTwitter } = usePrivy();
  const { profile } = useUser();

  const [step, setStep] = useState(0);
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

  const twitterAccount = user?.twitter;
  const hasTwitter = !!twitterAccount;

  function currentStepIndex() {
    if (step === 0) return 0;
    if (step === 1) return 1;
    if (step === 2 && isOrg) return 2;
    return isOrg ? 3 : 2;
  }

  function nextStep() {
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
      await upsertProfile({
        id: user.id,
        display_name: displayName,
        bio: bio || undefined,
        telegram_handle: telegram || undefined,
        email: email || undefined,
        account_type: accountType,
        twitter_handle: twitterAccount?.username ?? undefined,
        twitter_verified: hasTwitter,
        wallet_address:
          user.wallet?.address ?? undefined,
      });
      router.push("/feed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white/90">
            Sign in to get started
          </h1>
          <p className="text-zinc-400 mt-2">
            You need to be logged in to complete onboarding.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#080810] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStepIndex()
                  ? "bg-emerald-500"
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e14] p-6">
          {/* Step 0: Account Type */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-white/90 mb-1">
                Welcome to Manifest
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                Choose your account type to get started.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAccountType("individual")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors ${
                    accountType === "individual"
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <User
                    className={`size-8 ${accountType === "individual" ? "text-emerald-400" : "text-zinc-400"}`}
                  />
                  <span
                    className={`text-sm font-medium ${accountType === "individual" ? "text-emerald-400" : "text-zinc-300"}`}
                  >
                    Individual
                  </span>
                </button>
                <button
                  onClick={() => setAccountType("organization")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors ${
                    accountType === "organization"
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <Building2
                    className={`size-8 ${accountType === "organization" ? "text-emerald-400" : "text-zinc-400"}`}
                  />
                  <span
                    className={`text-sm font-medium ${accountType === "organization" ? "text-emerald-400" : "text-zinc-300"}`}
                  >
                    Organization
                  </span>
                </button>
              </div>
              <Button
                onClick={nextStep}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
              >
                Continue
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white/90 mb-1">
                Your Details
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                Tell us about yourself.
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300" htmlFor="displayName">
                    Display Name *
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1.5 bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300" htmlFor="bio">
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="What are you building?"
                    className="mt-1.5 bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300" htmlFor="telegram">
                    Telegram Handle
                  </Label>
                  <Input
                    id="telegram"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="your_handle"
                    className="mt-1.5 bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300" htmlFor="email">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 bg-white/5 border-white/10"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  <ArrowLeft className="size-4 mr-1.5" />
                  Back
                </Button>
                <Button
                  onClick={nextStep}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                >
                  Continue
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Org (only if organization) */}
          {step === 2 && isOrg && (
            <div>
              <h2 className="text-xl font-bold text-white/90 mb-1">
                Organization Details
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                Tell us about your organization.
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300" htmlFor="orgName">
                    Organization Name
                  </Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Protocol"
                    className="mt-1.5 bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300" htmlFor="orgWebsite">
                    Website
                  </Label>
                  <Input
                    id="orgWebsite"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    placeholder="https://acme.xyz"
                    className="mt-1.5 bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300" htmlFor="orgLogo">
                    Logo URL
                  </Label>
                  <Input
                    id="orgLogo"
                    value={orgLogo}
                    onChange={(e) => setOrgLogo(e.target.value)}
                    placeholder="https://acme.xyz/logo.png"
                    className="mt-1.5 bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  <ArrowLeft className="size-4 mr-1.5" />
                  Back
                </Button>
                <Button
                  onClick={nextStep}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                >
                  Continue
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Connect X */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-white/90 mb-1">
                Connect X (Twitter)
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                Link your X account to post intents. This verifies your identity.
              </p>

              {hasTwitter ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <CheckCircle className="size-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-400">
                      X Connected
                    </p>
                    <p className="text-xs text-zinc-400">
                      @{twitterAccount?.username}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={linkTwitter}
                  variant="outline"
                  className="w-full"
                >
                  <Link2 className="size-4 mr-2" />
                  Connect X Account
                </Button>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  <ArrowLeft className="size-4 mr-1.5" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                >
                  {submitting ? "Saving..." : "Complete Setup"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && step === 3 && (
          <p className="text-sm text-red-400 text-center mt-3">{error}</p>
        )}
      </div>
    </main>
  );
}
