// Komponen presentasional Nabung.
// PRINSIP PEMBEDA dari Inite (dashboard DeFi): TIDAK ada jargon "LP/pool/liquidity"
// di UI. Bahasa = bank: Saldo, Bunga, Setor, Tarik, Target. Asisten bersifat
// PROAKTIF (memberi nudge), bukan kotak chat reaktif.

import { useState } from "react";
import type { FlowState, SavingsPosition } from "@/types";
import { DEPOSIT_ASSETS } from "@/config";
import { miraStartLink, shareProgressLink, openTelegram } from "@/telegram";

const usd = (n: number) => `$${n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BalanceCard({ position, usdtPeg }: { position: SavingsPosition | null; usdtPeg?: number }) {
  const earned = position?.earnedUsd ?? 0;
  const down = earned < 0; // JUJUR: saldo bisa turun. Jangan sembunyikan.
  return (
    <div className="card balance">
      <p className="label">Saldo Tabungan</p>
      <p className="amount">{usd(position?.balanceUsd ?? 0)}</p>
      <div className="row">
        <span className={`pill ${down ? "neg" : "pos"}`}>
          {down ? "▼" : "▲"} {usd(Math.abs(earned))} bunga
        </span>
        <span className="apy">≈ {(position?.apyPercent ?? 0).toFixed(1)}% APY*</span>
      </div>
      <p className="footnote">
        *APY estimasi (target), bisa berubah — bukan bunga tetap.
        {usdtPeg ? ` USDT peg $${usdtPeg.toFixed(4)} (live STON.fi).` : ""}
      </p>
    </div>
  );
}

/** Jembatan KELUAR ke Mira: tanya asisten & bagikan progres (deep-link resmi). */
export function MiraActions({ position }: { position: SavingsPosition | null }) {
  const ctx = {
    action: "ask",
    balanceUsd: Math.round(position?.balanceUsd ?? 0),
    apy: position?.apyPercent ?? 0,
  };
  const askUrl = miraStartLink(ctx);
  const shareUrl = shareProgressLink(
    `Aku lagi nabung kripto di Nabung 🐷 — saldo ${usd(position?.balanceUsd ?? 0)} dengan ${(position?.apyPercent ?? 0).toFixed(1)}% APY. Coba juga!`,
  );
  return (
    <div className="card mira-actions">
      <div className="row">
        <span className="ava">✨</span>
        <strong>Bareng Mira</strong>
      </div>
      <div className="actions">
        <button className="ghost" onClick={() => openTelegram(askUrl)}>
          🤖 Tanya Mira
        </button>
        <button className="ghost" onClick={() => openTelegram(shareUrl)}>
          📣 Bagikan
        </button>
      </div>
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
        <p className="label">Target: {usd(goal)}</p>
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
      <p className="muted small">{pct.toFixed(0)}% menuju target — Mira akan ingatkan tiap minggu.</p>
    </div>
  );
}

/** Asisten PROAKTIF: menampilkan nudge ala Mira (bukan chat reaktif). */
export function AssistantTips({ position }: { position: SavingsPosition | null }) {
  const tips: string[] = [];
  if (position) {
    if (position.earnedUsd > 0) tips.push(`Kerja bagus — tabunganmu sudah menghasilkan ${usd(position.earnedUsd)}. 📈`);
    if (position.balanceUsd > 0 && position.balanceUsd < 50)
      tips.push("Tambah sedikit lagi yuk biar bunga makin terasa.");
    tips.push("Laporan video bulananmu akan dikirim Mira ke chat. 🎬");
  } else {
    tips.push("Ada dana nganggur? Tabung sekarang biar tidak diam saja. 💡");
  }
  return (
    <div className="card assistant">
      <div className="row">
        <span className="ava">✨</span>
        <strong>Mira</strong>
        <span className="muted small">asisten tabunganmu</span>
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
        ⓘ Ini bukan rekening bank. Pahami risikonya {open ? "▲" : "▼"}
      </button>
      {open && (
        <ul className="muted small">
          <li>Yield berasal dari <em>stable pool</em> (risiko impermanent loss minimal, tapi tidak nol).</li>
          <li>Pokok tidak dijamin & tidak berasuransi; nilai bisa turun.</li>
          <li>Ada risiko smart contract. APY berfluktuasi.</li>
          <li>Hanya tabung yang kamu siap tahan.</li>
        </ul>
      )}
    </div>
  );
}

/** Penjelasan 3-langkah di layar awal — bantu juri paham value prop cepat. */
export function HowItWorks() {
  const steps = [
    { i: "💸", t: "Setor token apa pun", d: "TON, USDT, NOT — bebas." },
    { i: "🔄", t: "Otomatis jadi USDT", d: "Rate terbaik via Omniston (STON.fi)." },
    { i: "🌱", t: "Tumbuh aman", d: "Ditabung di stable pool, risiko rendah." },
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

/** Pratinjau "Laporan bulanan Mira" — memamerkan pembeda asisten proaktif + Seedance. */
export function MiraReportPreview({ position }: { position: SavingsPosition | null }) {
  if (!position) return null;
  return (
    <div className="card report">
      <div className="row">
        <span className="ava">🎬</span>
        <strong>Laporan bulanan</strong>
        <span className="muted small">dikirim Mira</span>
      </div>
      <div className="report-frame">
        <div className="report-play">▶</div>
        <div className="report-meta">
          <p className="report-big">+{usd(position.earnedUsd)}</p>
          <p className="muted small">bulan ini · {position.apyPercent.toFixed(1)}% APY</p>
        </div>
      </div>
      <p className="muted small">Mira merangkum progres & kirim video ceria tiap awal bulan. 🎉</p>
    </div>
  );
}

const ASSETS = DEPOSIT_ASSETS;

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
        <h2>Setor tabungan</h2>
        <p className="muted small">Bayar pakai token apa pun — otomatis jadi USDT yang stabil.</p>

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
          {busy ? "Memproses…" : `Tabung ${amount} ${asset.symbol}`}
        </button>
      </div>
    </div>
  );
}

const FLOW_TEXT: Record<FlowState["status"], string> = {
  idle: "",
  quoting: "Mengecek rate terbaik…",
  "awaiting-signature": "Konfirmasi di wallet…",
  converting: "Menyeragamkan ke USDT…",
  "providing-liquidity": "Menabung…",
  confirming: "Menunggu konfirmasi jaringan…",
  done: "Berhasil ditabung! 🎉",
  error: "Ada kendala",
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
          Tutup
        </button>
      )}
    </div>
  );
}
