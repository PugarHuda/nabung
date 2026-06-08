// Presentational components for Nabung.
// KEY DIFFERENTIATOR vs Inite (a DeFi dashboard): NO "LP/pool/liquidity" jargon in the
// UI. Language = a savings bank: Balance, Earned, Deposit, Withdraw, Goal. The assistant
// is PROACTIVE (gives nudges), not a reactive chat box.

import { useState } from "react";
import type { FlowState, SavingsPosition } from "@/types";
import { DEPOSIT_ASSETS, IS_TESTNET } from "@/config";
import { miraStartLink, shareProgressLink, openTelegram } from "@/telegram";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BalanceCard({ position, usdtPeg }: { position: SavingsPosition | null; usdtPeg?: number }) {
  const earned = position?.earnedUsd ?? 0;
  const down = earned < 0; // HONEST: balance can go down. Don't hide it.
  return (
    <div className="card balance">
      <p className="label">Savings Balance</p>
      <p className="amount">{usd(position?.balanceUsd ?? 0)}</p>
      <div className="row">
        <span className={`pill ${down ? "neg" : "pos"}`}>
          {down ? "▼" : "▲"} {usd(Math.abs(earned))} earned
        </span>
        <span className="apy">≈ {(position?.apyPercent ?? 0).toFixed(1)}% APY*</span>
      </div>
      <p className="footnote">
        *Estimated APY (target), can change — not a fixed rate.
        {usdtPeg ? ` USDT peg $${usdtPeg.toFixed(4)} (live STON.fi).` : ""}
      </p>
    </div>
  );
}

export function GoalCard({ position, miraGoalUsd }: { position: SavingsPosition | null; miraGoalUsd?: number }) {
  const [goal, setGoal] = useState<number>(miraGoalUsd ?? 1000);
  const bal = position?.balanceUsd ?? 0;
  const pct = Math.min(100, goal > 0 ? (bal / goal) * 100 : 0);
  return (
    <div className="card goal">
      <div className="row spread">
        <p className="label">Goal: {usd(goal)}</p>
        <input
          className="goal-input"
          type="number"
          value={goal}
          min={0}
          onChange={(e) => setGoal(Number(e.target.value))}
        />
      </div>
      <div className="bar">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="muted small">{pct.toFixed(0)}% to your goal — Mira will remind you weekly.</p>
    </div>
  );
}

/** PROACTIVE assistant: shows Mira-style nudges (not a reactive chat). */
export function AssistantTips({ position }: { position: SavingsPosition | null }) {
  const tips: string[] = [];
  if (position) {
    if (position.earnedUsd > 0) tips.push(`Nice work — your savings have earned ${usd(position.earnedUsd)}. 📈`);
    if (position.balanceUsd > 0 && position.balanceUsd < 50)
      tips.push("Add a little more so the interest really adds up.");
    tips.push("Your monthly video report will be sent by Mira in chat. 🎬");
  } else {
    tips.push("Got idle funds? Start saving so they don't just sit there. 💡");
  }
  return (
    <div className="card assistant">
      <div className="row">
        <span className="ava">✨</span>
        <strong>Mira</strong>
        <span className="muted small">your savings assistant</span>
      </div>
      <ul className="tips">
        {tips.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function RiskNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="risk">
      <button className="risk-toggle" onClick={() => setOpen((o) => !o)}>
        ⓘ This is not a bank account. Understand the risks {open ? "▲" : "▼"}
      </button>
      {open && (
        <ul className="muted small">
          <li>Yield comes from a <em>stable pool</em> (minimal impermanent loss, but not zero).</li>
          <li>Principal is not guaranteed or insured; value can go down.</li>
          <li>There is smart-contract risk. APY fluctuates.</li>
          <li>Only save what you can afford to hold.</li>
        </ul>
      )}
    </div>
  );
}

/** Step-by-step explainer on the landing screen — helps judges grasp the value prop fast. */
export function HowItWorks() {
  const steps = [
    { i: "💸", t: "Deposit any token", d: "TON, USDT, NOT — your choice." },
    { i: "🔄", t: "Auto-converted to USDT", d: "Best rate via Omniston (STON.fi)." },
    { i: "🌱", t: "Grow safely", d: "Saved in a stable pool, low risk." },
  ];
  return (
    <div className="how">
      {steps.map((s, i) => (
        <div className="how-step" key={i}>
          <span className="how-ico">{s.i}</span>
          <div>
            <strong>{s.t}</strong>
            <p className="muted small">{s.d}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** "Mira monthly report" preview — showcases the proactive-assistant + Seedance differentiator. */
export function MiraReportPreview({ position }: { position: SavingsPosition | null }) {
  if (!position) return null;
  return (
    <div className="card report">
      <div className="row">
        <span className="ava">🎬</span>
        <strong>Monthly report</strong>
        <span className="muted small">by Mira</span>
      </div>
      <div className="report-frame">
        <div className="report-play">▶</div>
        <div className="report-meta">
          <p className="report-big">+{usd(position.earnedUsd)}</p>
          <p className="muted small">this month · {position.apyPercent.toFixed(1)}% APY</p>
        </div>
      </div>
      <p className="muted small">Mira sums up your progress & sends a fun video at the start of each month. 🎉</p>
    </div>
  );
}

/** OUTBOUND bridge to Mira: ask the assistant & share progress (official deep links). */
export function MiraActions({ position }: { position: SavingsPosition | null }) {
  const ctx = {
    action: "ask",
    balanceUsd: Math.round(position?.balanceUsd ?? 0),
    apy: position?.apyPercent ?? 0,
  };
  const askUrl = miraStartLink(ctx);
  const shareUrl = shareProgressLink(
    `I'm saving crypto with Nabung 🐷 — balance ${usd(position?.balanceUsd ?? 0)} at ${(position?.apyPercent ?? 0).toFixed(1)}% APY. Try it!`,
  );
  return (
    <div className="card mira-actions">
      <div className="row">
        <span className="ava">✨</span>
        <strong>With Mira</strong>
      </div>
      <div className="actions">
        <button className="ghost" onClick={() => openTelegram(askUrl)}>
          🤖 Ask Mira
        </button>
        <button className="ghost" onClick={() => openTelegram(shareUrl)}>
          📣 Share
        </button>
      </div>
    </div>
  );
}

// Testnet real-action: deposits are real TON self-transfers (receipts), so TON only.
const ASSETS = IS_TESTNET ? DEPOSIT_ASSETS.filter((a) => a.symbol === "TON") : DEPOSIT_ASSETS;

export function DepositSheet({
  defaultAmount,
  onClose,
  onDeposit,
}: {
  defaultAmount?: number;
  onClose: () => void;
  onDeposit: (symbol: string, amount: number, decimals: number) => Promise<void>;
}) {
  const [asset, setAsset] = useState(ASSETS[0]);
  const [amount, setAmount] = useState<number>(defaultAmount ?? 10);
  const [busy, setBusy] = useState(false);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2>Add to savings</h2>
        <p className="muted small">
          {IS_TESTNET
            ? "Real testnet TON transaction (self-custodial). Yield is simulated."
            : "Pay with any token — auto-converted to stable USDT."}
        </p>

        <div className="chips">
          {ASSETS.map((a) => (
            <button
              key={a.symbol}
              className={`chip ${a.symbol === asset.symbol ? "active" : ""}`}
              onClick={() => setAsset(a)}
            >
              {a.symbol}
            </button>
          ))}
        </div>

        <input
          className="amount-input"
          type="number"
          value={amount}
          min={0}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="0.00"
        />

        <button
          className="primary full"
          disabled={busy || amount <= 0}
          onClick={async () => {
            setBusy(true);
            try {
              await onDeposit(asset.symbol, amount, asset.decimals);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Processing…" : `Save ${amount} ${asset.symbol}`}
        </button>
      </div>
    </div>
  );
}

const FLOW_TEXT: Record<FlowState["status"], string> = {
  idle: "",
  quoting: "Checking the best rate…",
  "awaiting-signature": "Confirm in your wallet…",
  converting: "Converting to USDT…",
  "providing-liquidity": "Saving…",
  confirming: "Waiting for network confirmation…",
  done: "Saved successfully! 🎉",
  error: "Something went wrong",
};

export function FlowBanner({ flow, onDismiss }: { flow: FlowState; onDismiss: () => void }) {
  if (flow.status === "idle") return null;
  const isErr = flow.status === "error";
  const isDone = flow.status === "done";
  return (
    <div className={`flow ${isErr ? "err" : isDone ? "ok" : "busy"}`}>
      <span>{flow.message || FLOW_TEXT[flow.status]}</span>
      {isErr && <span className="muted small">{flow.error}</span>}
      {(isErr || isDone) && (
        <button className="link" onClick={onDismiss}>
          Close
        </button>
      )}
    </div>
  );
}
