# Manifest — Product Requirements Document

| Field | Detail |
|-------|--------|
| Product | Manifest |
| Version | v1.0 |
| Author | Bondman |
| Status | Draft |
| Last Updated | 2026-03-27 |

---

## 1. Background & Goals

### 1.1 The Problem

Web3 deal flow is broken. Founders want partnerships. Investors are looking for projects. Protocols need integrations. Ecosystems want builders. But all of this happens in closed Telegram groups, cold Twitter DMs, and intro chains. There is no structured, public, trust-verified layer where Web3 participants can declare what they want and find the right people to make it happen.

Twitter is noise. LinkedIn is Web2. Telegram is closed. There is no open intent graph for Web3.

### 1.2 What Manifest Is

A **public intent board for Web3** — where builders, founders, investors, protocols, and DAOs declare what they want to build toward, and find verified partners to make it real.

You post an intent. Others discover it and request a connection. You accept. Contact details are revealed. The intent lifecycle is tracked onchain.

### 1.3 Strategic Goals

- Become the default deal-flow layer for Web3 ecosystem collaboration
- Build a trust-verified network where signal-to-noise is structurally high
- Create an onchain identity layer through Proof of Intent NFTs

### 1.4 Success Metrics

| Metric | Target (30 days) | Target (90 days) |
|--------|-----------------|-----------------|
| Verified users | 200 | 1,000 |
| Intents posted | 100 | 500 |
| Connection requests sent | 300 | 2,000 |
| Connection accept rate | >30% | >40% |
| Intents with "Partnership Formed" outcome | 10 | 75 |
| Intents with Proof of Intent NFT | 100% | 100% |

---

## 2. Users & Scenarios

### 2.1 Target Users

| User Type | Description |
|-----------|-------------|
| **Protocol / DAO** | Web3 team posting on behalf of their org — seeking integrations, co-marketing, ecosystem grants, beta testers |
| **Founder / Builder** | Individual building in Web3 — seeking investment, partnerships, hiring |
| **Investor / Fund** | Looking for deal flow — posting investment intents, browsing for projects |
| **Ecosystem Player** | BD lead, ecosystem rep, community builder — posting ecosystem support intents |

All users verified via X (Twitter). Both org and individual accounts require X verification before posting.

### 2.2 Core Scenarios

**Scenario 1 — Protocol seeking integration partner**
> As a DeFi protocol BD lead, I want to post a public intent stating we're looking for a lending protocol integration, so that the right teams find us instead of us cold-DMing everyone.

**Scenario 2 — Builder seeking investment**
> As an early-stage founder, I want to declare I'm raising a pre-seed round in the AI x DeFi space, so that aligned investors can discover me and reach out with context.

**Scenario 3 — Ecosystem player browsing deal flow**
> As an ecosystem BD rep, I want to browse intents filtered by my ecosystem (e.g. Base) and see who is actively looking for what, so I can connect the right builders to the right protocols.

**Scenario 4 — Investor finding projects**
> As a crypto fund associate, I want to see a feed of investment intents filtered by stage and sector, so I can surface deal flow I'd otherwise miss.

### 2.3 User Journey

```
Sign up (email/Google/X)
    → X account linked (required before posting)
    → Embedded wallet auto-created (silent, background)
    → Onboarding: set display name, bio, org or individual
    → Browse intent feed
    → Post intent (type, description, ecosystem, sector, priority, duration)
    → NFT auto-minted to embedded wallet (silent)
    → Others discover intent and send connection request + pitch
    → Poster accepts or declines
    → On accept: contact details (Telegram/email) revealed to both parties
    → Intent lifecycle updated: active → in discussion → partnership formed / closed
    → Profile shows Intent NFT badges
```

---

## 3. Product Requirements

### 3.1 Intent Types

| Type | Description |
|------|-------------|
| Partnership | Looking for a strategic partner to build together |
| Investment | Raising capital / seeking investors |
| Integration | Technical integration with another protocol or tool |
| Hiring | Looking for specific talent or contributors |
| Co-marketing | Joint campaigns, announcements, or content collabs |
| Grant | Offering or seeking grant funding |
| Ecosystem Support | Offering or seeking ecosystem resources, BD, intros |
| Beta Testers | Looking for early users or testers |

### 3.2 Feature List

#### P0 — Must Have (Launch Blockers)

| Feature | Description |
|---------|-------------|
| Auth via Privy | Email, Google, X login. Embedded wallet auto-created silently on first login |
| X verification gate | User must link X account before posting intents. X login = auto-verified |
| Intent creation | Post intent with: type, content, ecosystem, sector, priority, expiry (1–90 days) |
| Intent templates | Per-type structured prompt to guide quality posts (e.g. Partnership: "We're looking for X because Y, ideal partner does Z") |
| Intent feed | Paginated, filterable public feed. Filter by: type, ecosystem, sector, priority |
| Connection request | Send pitch message to intent poster. Poster accepts or declines |
| Contact reveal | On accept: Telegram handle + email revealed to both parties |
| Intent lifecycle | Track: active → in discussion → partnership formed / closed |
| Proof of Intent NFT | Soulbound ERC-721 minted server-side to user's embedded wallet on intent creation. Base mainnet. Deployer wallet pays gas |
| Profile page | Display name, bio, X handle, org, open intents, intent history, NFT badges |
| Onboarding | Org or individual account type. Name, bio, contact details. X link prompt |

#### P1 — Should Have (Week 2–4)

| Feature | Description |
|---------|-------------|
| Org profiles | Org name, logo, website, member list. Members post intents on behalf of org |
| Org invite system | Invite code or link to join an org |
| Save / bookmark intents | Save intents to review later |
| Interest signal | Heart reaction on intents. Count shown publicly |
| Search | Full-text search across intent content |
| Notifications | In-app: new connection request, request accepted/declined, intent expiring |
| Preset filters | One-click presets: Trending, Urgent, Ending Soon, New Today |
| Share to X | One-click share intent to Twitter with pre-filled text |
| Response rate signal | "Active" / "Last seen" indicator on profiles to filter responsive posters |
| Comments | Threaded discussion on intents |

#### P2 — Could Have (Post-Launch)

| Feature | Description |
|---------|-------------|
| Email / Telegram digest | Weekly email of new intents matching saved filters |
| Saved filters with alerts | Save a filter combo and get notified on new matches |
| Similar intents | Show related intents on an intent's detail view |
| Intent quality score | Completeness indicator that nudges better writing |
| Following feed | See intents only from orgs/people you follow |
| Trending intents | Algorithm-surfaced high-engagement intents |
| Wallet export | "Export my wallet" option for users who want to use their NFTs externally |
| Public connection count | Show "12 requests sent" on intent cards as social proof |

#### Not in Scope (v1)

- AI-powered "For You" recommendations (needs data volume)
- Geography filter (Web3 is borderless)
- Intent NFTs on Sepolia (mainnet only)
- Coinbase Paymaster / ERC-4337 (add at scale)
- Complex org analytics dashboard
- Weekly digest cron (simplified notification only)
- Agentic / automated intent posting

### 3.3 Intent Creation — Template System

Each intent type shows a structured prompt to guide the user:

**Partnership:**
> "We're [org/your name], building [what]. We're looking for a partner who [does what]. Ideal collaboration would involve [specific ask]. Ecosystem: [tag]. Timeline: [open/urgent]."

**Investment:**
> "We're raising [stage] for [project]. We've built [traction signal]. Looking for [investor type]. Check size: [range or open]."

**Integration:**
> "We need a [type] integration for [use case]. Our stack: [tech]. Ideal partner already has [capability]. Timeline: [days]."

*(Templates for all 8 types)*

---

## 4. Trust Architecture

### 4.1 Trust Layers

| Layer | Mechanism | Meaning |
|-------|-----------|---------|
| Identity | Privy X OAuth | "This is a real person with a real X account" |
| Commitment | Proof of Intent NFT (Base mainnet) | "This intent is permanently recorded onchain" |
| Reputation | Response rate signal | "This poster is active and responsive" |
| Social | Interest count, connection count | "Others find this intent credible" |

### 4.2 X Verification Rules

- Logging in **with X** = automatically verified, can post immediately
- Logging in **with email/Google** = account created, prompted to link X before first post
- No X linked = read-only (can browse, save, send requests) but cannot post intents
- Org accounts: the individual member must be X-verified; org itself links its own X handle separately

### 4.3 Proof of Intent NFT

- **Contract**: Soulbound ERC-721 on Base mainnet
- **Mint trigger**: Server-side, automatically on intent creation
- **Gas**: Paid by deployer wallet (funded with ETH, ~$0.001/mint on Base)
- **Recipient**: User's Privy embedded wallet address
- **Metadata**: Intent type, creation timestamp, poster's wallet address
- **User experience**: Invisible — user sees "🏅 My Intent NFTs" section on profile, badges accumulate silently
- **Export**: User can export their embedded wallet private key if they want full custody

---

## 5. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router) | SSR, API routes, edge-ready |
| Auth + Wallet | Privy | Email/social login + embedded wallet in one SDK. Replaces Clerk |
| Database | Supabase (Postgres) | RLS, realtime feed updates, existing schema patterns |
| Realtime | Supabase Realtime | Live intent feed without polling |
| Styling | Tailwind CSS + shadcn/ui | Consistent component system |
| NFT Contract | Solidity ERC-721 (soulbound) | Base mainnet |
| NFT Minting | Server-side via viem + deployer wallet | User pays no gas |
| Deployment | Vercel | Edge network, easy env vars, preview deployments |
| Email (optional) | Resend | Transactional notifications |

### 5.1 Supabase → Privy JWT Integration

Supabase RLS policies validate JWTs. Privy issues JWTs on login. Configure Supabase to accept Privy's JWT secret:
- Set `SUPABASE_JWT_SECRET` to Privy's JWKS endpoint
- RLS policies use `auth.uid()` = Privy user ID
- Clean swap, no schema changes needed

### 5.2 Database Schema (Core Tables)

```
profiles          — id (privy user id), display_name, bio, twitter_handle, 
                    twitter_verified, wallet_address, telegram_handle, email, 
                    account_type, created_at

organizations     — id, name, slug, logo_url, website, twitter_handle, 
                    twitter_verified, created_at

org_members       — id, org_id, profile_id, role, joined_at

intents           — id, author_id, org_id (nullable), type, content, 
                    ecosystem, sector, priority, expires_at, lifecycle_status,
                    closed_reason, nft_token_id, nft_tx_hash, created_at

connection_requests — id, intent_id, sender_id, receiver_id, pitch_message,
                      status (pending/accepted/declined), created_at

contacts          — id, connection_id, user_id, telegram_handle, email (encrypted)

saved_intents     — id, user_id, intent_id, created_at
intent_interests  — id, user_id, intent_id, created_at
intent_views      — id, intent_id, viewer_id, created_at
notifications     — id, user_id, type, payload, read, created_at
```

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low intent quality at launch | High | High | Templates per intent type. X verification filters spam by default |
| Cold start — empty feed | High | High | Seed with 20–30 real intents from Bondman's network before public launch |
| Deployer wallet runs out of ETH | Low | Medium | Alert when balance < 0.01 ETH. $20 ETH = ~20,000 mints |
| Privy + Supabase JWT mismatch | Medium | High | Test JWT flow in staging before launch. Document setup clearly |
| X API rate limits on verification | Low | Medium | X login via Privy OAuth handles this natively — not a custom API call |
| Base mainnet contract bug | Low | High | Audit contract before deploying. Keep contract minimal (ERC-721 + soulbound modifier only) |
| Low connection accept rate | Medium | High | Response rate signals on profiles. Notification on new requests |

---

## 7. Milestones

| Phase | Deliverables | Target |
|-------|-------------|--------|
| **M0 — Foundation** | Repo scaffolded, Privy auth, Supabase connected, basic intent CRUD, NFT contract deployed to Base mainnet | Week 1 |
| **M1 — Core Loop** | Intent feed, connection request flow, contact reveal, lifecycle tracking, profile page with NFT badges | Week 2 |
| **M2 — Trust Layer** | X verification gate, org profiles + invite system, intent templates, onboarding flow | Week 3 |
| **M3 — Discovery** | Filters, search, presets, save/bookmark, interest signals, share to X | Week 4 |
| **M4 — Polish** | Notifications, response rate signals, comments, mobile responsive audit, SEO | Week 5 |
| **M5 — Launch** | Seed content, soft launch to Bondman's network, monitor and fix | Week 6 |

---

## 8. Launch Strategy

- **Seed phase**: Bondman posts 20–30 real intents from his network across StaderLabs, KelpDAO, Mira, Huddle01 communities. Feed looks alive before public launch.
- **Soft launch**: Share with protocol BD and ecosystem contacts first — they're the highest-signal users and will post real intents.
- **Growth loop**: Every intent shared on X with "Posted on Manifest" links back. Network effect from verified Web3 accounts sharing their own intents.
- **Position**: "Manifest is where Web3 builders declare what they're building toward — and find the people who make it real."

---

## Appendix — Out of Scope for v1

- AI recommendations / personalized feed
- Geography filtering
- Complex org analytics
- Telegram/email digest cron
- Agentic intent posting
- Coinbase Paymaster / ERC-4337 gasless
- Multi-chain NFTs
- Token-gated intents
