# 🐷 Nabung — Crypto Savings in Telegram

> Deposit any token → we normalize it to USDT → it's auto-saved into a low-risk yield
> venue on STON.fi → Mira acts as a proactive assistant that reports & reminds.
> **DeFi yield that feels like a savings app.**

Built for the **STON.fi Vibe Coding Hackathon – Wave 2** · Tracks: **STON.fi + Mira**.

**Live:** https://nabung-two.vercel.app · **Bot:** [@nabungwoybot](https://t.me/nabungwoybot)

---

## Why this is NOT "Inite" (a previous winner)
Inite (Wave 1 Silver) was a *DeFi dashboard* with chat for staking/LP/swaps. Nabung is
deliberately differentiated on 4 points — if these don't stand out, it would feel like Inite:

| Differentiator | Inite | **Nabung** |
|---|---|---|
| (a) Abstraction | DeFi dashboard (user sees pools/LP) | **Savings account** — DeFi jargon fully hidden |
| (b) Deposits | Specific tokens | **ANY token in** → normalized to USDT via Omniston |
| (c) AI role | Reactive chat (you ask) | **Proactive assistant** — video reports, triggers, nudges |
| (d) Yield | Generic LP (has IL) | **Single-sided stable pool** → minimal IL, framed "safe" + honest about risk |

---

## Architecture
```
Any token ─(Omniston best-rate)→ USDT ─(single-sided)→ STON.fi STABLE POOL → yield
       ▲                                                            │
  TON Connect (signing)                                     on-chain = source of truth
       │                                                            ▼
  Mini App (React/Vite) ◄─ deep-link payload ─ Mira (skill, memory, trigger, Seedance)
```

## Integration stack
**STON.fi / TON:** `@ston-fi/sdk` (single-sided LP v2), `@ston-fi/omniston-sdk` (conversion,
**verified live**), `@ston-fi/api` (USDT peg & APY, live in the UI), `@tonconnect/ui-react`,
`@ton/core`/`@ton/ton`.
**Mira:** bot menu button, inbound deep-link (parse payload), outbound deep-links (Ask Mira /
Share), custom skills (`/nabung`, `/saldo`), Seedance monthly report. See `mira-skills/nabung.md`.

## Run
```bash
cd nabung
npm install
cp .env.example .env.local   # default VITE_MOCK=true → demoable without a wallet
npm run dev
```
- **DEMO mode (default):** simulated balances, but **LIVE** USDT peg/APY from STON.fi → showable immediately.
- **LIVE mode:** set `VITE_MOCK=false` + RPC/API key + run over an HTTPS tunnel (ngrok/cloudflared)
  so the Telegram Mini App & TON Connect work. Update `url` in `public/tonconnect-manifest.json`
  & `VITE_MANIFEST_URL`.

## Implementation status
- [x] Savings UI (balance, earned, goal, proactive assistant, honest risk note) — **runs in DEMO mode**
- [x] Deposit/withdraw flow with **recovery checkpoint** & slippage/stale-quote checks (`src/lib/savings.ts`)
- [x] **Omniston quote + swap execution** — VERIFIED on mainnet (`src/lib/omniston.ts`)
- [x] **@ston-fi/api** live USDT peg in the UI (`src/lib/api.ts`)
- [x] Stable-pool selection scaffold (`src/lib/api.ts`)
- [x] **Mira deep-link** bridge in & out + bot menu button (`src/telegram.ts`)
- [x] Custom **skill + trigger + Seedance** templates (`mira-skills/nabung.md`)
- [ ] Single-sided LP provide leg + on-chain `readPosition` (needs mainnet + funds to verify)

## Testnet vs Mainnet
STON.fi v2 has a testnet router, but **api.ston.fi is mainnet-only** and stable-pool/Omniston
liquidity is effectively absent on testnet. So testnet only validates **TON Connect + signing**;
**real swap/yield needs mainnet** (small amounts). The demo uses MOCK + live read-only data.

## QA decisions enforced in the code
- **Impermanent Loss:** default to **stable pool + single-sided** (`config.ts` `DEFAULT_RISK="conservative"`).
- **Honest balance:** the UI shows interest **can be negative** (go down), unvarnished (`components.tsx` `BalanceCard`).
- **Recovery:** if the swap succeeds but providing liquidity fails, funds stop at USDT (safe) + clear message (`savings.ts`).
- **Slippage/stale quote:** must re-confirm before signing (`omniston.ts`, `savings.ts`).
- **Source of truth:** official numbers come from on-chain (`ston.ts readPosition`), Mira memory is only a UX cache.
- **Small-amount economics:** minimum deposit (`config.ts` `minDepositUsd`).
- **Not a bank:** explicit risk disclaimer in the UI, no "guaranteed/insured" wording.

## Deploy
A Telegram Mini App needs a **public HTTPS URL**. Two paths:

**A. Vercel (primary, root URL)** — repo connected; auto-deploys on push. Framework **Vite**,
build `npm run build`, output `dist`. Live at https://nabung-two.vercel.app.

**B. GitHub Pages (mirror)** — `.github/workflows/deploy.yml` builds & deploys on push to `main`
(Settings → Pages → Source: GitHub Actions). Base path handled via `VITE_BASE`.

To make it a real Mini App:
1. BotFather → `/newapp` (or `/setmenubutton`) → paste the deploy URL.
2. `public/tonconnect-manifest.json` `url`+`iconUrl` already point to the Vercel domain (or set `VITE_MANIFEST_URL`).
3. For live (non-MOCK): set `VITE_MOCK=false`, `VITE_NETWORK`, + RPC/API key.

## Disclaimer
Not financial advice. Not an insured product. Principal is at risk; yield fluctuates.
