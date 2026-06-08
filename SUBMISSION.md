# Nabung — Hackathon Submission

**STON.fi Vibe Coding Hackathon — Wave 2 (Cohort 2)**
Tracks: **STON.fi** + **Mira**

> Copy-paste answers for the submission form. Fields marked **[FILL]** need your input.

---

### Title
Nabung — Crypto Savings in Telegram

### Track(s)
STON.fi · Mira *(add both)*

### Cover
**[FILL]** — upload a screenshot of the Mini App (the balance screen) or the 🐷 logo. (A 512px brand icon is in `public/icon.png`.)

### Description
**Nabung** makes DeFi yield feel like a savings app, inside Telegram.

You deposit any TON token; Nabung normalizes it to stable **USDT** using **STON.fi's Omniston** best-rate aggregator, then saves it into a low‑impermanent‑loss position. **Mira** acts as a *proactive* AI savings assistant — monthly video reports, goal reminders, and in‑chat help — instead of a passive DeFi dashboard.

Why it matters: TON's superpower is Telegram‑native distribution to mainstream users, but DeFi yield is intimidating (pools, LP, impermanent loss, gas). Nabung hides all of that behind a clean "Savings Balance / Deposit / Withdraw / Goal" UX — honest about risk, never using the words "guaranteed" or "insured."

Differentiation: unlike a chat‑style DeFi dashboard, Nabung is (a) a full savings‑account abstraction with zero DeFi jargon, (b) accepts *any* token in (auto‑converted via Omniston), (c) a *proactive* assistant (reports/triggers, not reactive chat), and (d) defaults to a low‑IL stable position.

Status (honest): the Omniston conversion engine is real and **mainnet‑verified** (live quote + unsigned swap tx). The public demo runs in a simulated‑balance mode (so judges can explore without a wallet) while showing **live** STON.fi data (USDT peg). A **testnet real‑action mode** (tap the banner in the Mini App) makes deposits/withdrawals **real on‑chain transactions** (self‑custodial, signed via TON Connect) with yield simulated — because real DeFi yield isn't available on TON testnet.

### Makers
PugarHuda *(add team members if any)*

### Project name
Nabung

### Project oneliner
Crypto savings as simple as chat — deposit any token in Telegram, Omniston converts it to stable USDT, and Mira is your proactive AI savings assistant.

### Short description
Nabung turns DeFi yield into a savings‑app experience inside Telegram. Deposit any TON token → auto‑converted to stable USDT via STON.fi's Omniston aggregator → saved in a low‑IL position. Mira provides monthly video reports, reminders, and in‑chat help. Honest about risk; built mobile‑first as a Telegram Mini App.

### Tell us about AI tools and integrations used
Built end‑to‑end with **Claude (Claude Code)** as the AI coding agent — architecture, SDK research, implementation, debugging (e.g., diagnosing & fixing a Telegram‑WebView `Buffer is not defined` crash via node polyfills), and deployment/CI.

STON.fi integrations:
- **Omniston** aggregator — real best‑rate `requestForQuote` + `tonBuildSwap` (any token → USDT), **verified on mainnet**.
- **@ston-fi/api** — live USDT peg / pool APY shown in the UI.
- **@ston-fi/sdk v2** — single‑sided liquidity into a stable pool (savings leg).
- **TON Connect** — wallet connection & signing.

Mira integrations (Mira has no public API, so we used its official channels):
- Telegram bot **@nabungwoybot** menu button → opens the Mini App.
- **Inbound deep‑link** payload parsing (Mira → app context).
- **Outbound deep‑links**: "Ask Mira" and "Share progress".
- **Custom skill templates** (`/nabung`, `/saldo`) + a **scheduled Seedance monthly video report** (see `mira-skills/nabung.md`).

### Telegram handle
**[FILL]** — your personal Telegram @handle (e.g., @PugarHuda).

### Github repository
https://github.com/PugarHuda/nabung

### Product URL
https://nabung-two.vercel.app  *(demo; testnet real‑action via @nabungwoybot → tap the banner)*

### Loom video link
**[FILL]** — record a 1–2 min walkthrough (open the Mini App, show deposit/withdraw, Mira actions, the live STON.fi data, and the testnet real‑action toggle).

### TON Wallet
**[FILL]** — use a **mainnet** wallet you control for prizes (NOT the testnet demo wallet whose seed was shared during dev).

---

## Mira track answers

### How Did You Use Mira?
Mira is the AI layer of Nabung. Concretely: (1) our Telegram bot's menu button opens the Nabung Mini App; (2) the app reads an **inbound deep‑link payload** from Mira (e.g., a savings goal) and pre‑fills the flow; (3) "**Ask Mira**" and "**Share**" buttons build **outbound deep‑links** back into @mira with the user's savings context; (4) we authored **custom Mira skills** (`/nabung`, `/saldo`) and a **scheduled skill** that generates a **Seedance monthly video report** celebrating savings progress. Mira plays a *proactive* assistant role (reports, nudges, reminders), not a passive chatbot.

### Challenges & Feedback
Mira has **no public API/SDK/webhook** (confirmed with the team), so a Mini App can't send structured data to Mira programmatically. We worked around this with deep‑links + custom skills + the bot menu button. Feedback: a lightweight **API or Mini‑App event/webhook** (send context → receive Mira's response in‑app) would unlock much deeper agentic products. Also a documented way to register MCP tools / skills programmatically.

### Mira Chat History / Evidence of Usage
**[FILL]** — link/screenshot evidence: e.g., the @mira chat where you created the `/nabung` & `/saldo` skills (paste the prompts from `mira-skills/nabung.md`), and the @nabungwoybot bot opening the Mini App. (Install the skills first, then screenshot.)

### Additional links
- Bot: https://t.me/nabungwoybot
- GitHub Pages mirror: https://pugarhuda.github.io/nabung/
- Mira skill templates: `mira-skills/nabung.md` in the repo
