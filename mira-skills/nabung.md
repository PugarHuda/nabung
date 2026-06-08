# Mira Custom Skills for Nabung

Mira has **no public API** (confirmed by the Mira team). So integration uses the official
channels: **deep-link + custom skill + trigger + Seedance**. Below are paste-ready skill
prompts (create them via `/skill_creator` in the @mira chat, or by saying "Create a skill ...").

Deep-link payload: the Mini App builds `t.me/<bot>?startapp=<base64url(JSON)>`, then the skill
reads it. JSON schema: `{ "action": "deposit|withdraw|goal", "amountUsd": number, "goalUsd": number }`.

---

## 1) Skill: `/nabung` — open & route
```
Name: Nabung
Trigger: /nabung
Instructions:
You are the savings assistant "Nabung". When invoked:
1. Greet warmly and briefly.
2. If the user mentions an amount/goal (e.g. "save 50 dollars" or "goal 1000"),
   extract the number.
3. Provide a button/deep-link to open the Nabung Mini App via @nabungwoybot
   (the 🐷 Nabung menu button), with a payload matching the user's intent:
   - saving   -> action=deposit, amountUsd=<n>
   - set goal -> action=goal, goalUsd=<n>
4. Always remind honestly: "Yield comes from a STON.fi pool; low risk but not risk-free;
   principal is not guaranteed."
Never promise a fixed return and never invent an APY — point to the Mini App for real numbers.
```

## 2) Skill: `/saldo` — check balance (inline-friendly)
```
Trigger: /saldo
Instructions:
Report the latest known savings balance from the conversation memory. Keep it short:
balance, interest earned, and progress toward the goal. Stress that the official numbers
are in the Mini App (on-chain = source of truth). Offer a deep-link to deposit again.
```

## 3) Scheduled skill: Monthly Report (Seedance)
```
Name: Nabung Monthly Report
Schedule: 1st of each month, 09:00
Instructions:
Summarize last month's savings (starting balance, deposits, interest, ending balance, goal
progress). Then GENERATE A SHORT VIDEO (Seedance) in a cheerful style celebrating the user's
savings progress, with the key numbers as text. Send it to the chat. Close with a gentle nudge
to add more if they're below their goal.
```

## 4) Proactive triggers (max 10 per user)
- **APY drops significantly** → "Your savings APY dropped to X%. Still safe; want me to hold or move it?"
- **Goal milestone** (25/50/75/100%) → a celebratory card/image.
- **Idle funds detected** (idle wallet balance) → "You have $X sitting idle — want to save it?"

---

## Honesty note (important for the Mira track & judges)
Skills MUST refuse to make "guaranteed/risk-free" claims. Here, Mira plays a **proactive
assistant** (reports, nudges, reminders) — not just a reactive chatbot. This is what sets
Nabung apart from a typical DeFi chat-dashboard.
