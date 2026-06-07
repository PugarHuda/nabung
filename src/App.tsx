import { useMemo, useState } from "react";
import { TonConnectButton } from "@tonconnect/ui-react";
import { useSavings } from "@/hooks/useSavings";
import { BalanceCard, DepositSheet, AssistantTips, RiskNote, GoalCard, FlowBanner } from "@/components";
import { readMiraPayload } from "@/telegram";
import { MOCK } from "@/config";

export default function App() {
  const { wallet, position, flow, deposit, withdraw, resetFlow } = useSavings();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Konteks dari Mira (deep-link): mis. buka langsung ke setor / set tujuan.
  const mira = useMemo(() => readMiraPayload(), []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🐷</span>
          <div>
            <h1>Nabung</h1>
            <p className="tagline">Tabungan kripto, sesimpel chat.</p>
          </div>
        </div>
        <TonConnectButton />
      </header>

      {MOCK && <div className="mock-pill">MODE DEMO — data simulasi</div>}

      {!wallet ? (
        <section className="empty">
          <p className="big">Sisihkan, biarkan tumbuh. 🌱</p>
          <p className="muted">
            Setor token apa pun — kami seragamkan jadi USDT yang stabil dan tabung di tempat
            ber-risiko rendah. Hubungkan wallet untuk mulai.
          </p>
          <RiskNote />
        </section>
      ) : (
        <main className="stack">
          <BalanceCard position={position} />

          <div className="actions">
            <button className="primary" onClick={() => setSheetOpen(true)}>
              ＋ Setor
            </button>
            <button className="ghost" disabled={!position} onClick={withdraw}>
              Tarik
            </button>
          </div>

          <GoalCard position={position} miraGoalUsd={mira?.goalUsd} />
          <AssistantTips position={position} />
          <RiskNote />
        </main>
      )}

      {sheetOpen && (
        <DepositSheet
          defaultAmount={mira?.amountUsd}
          onClose={() => setSheetOpen(false)}
          onDeposit={async (sym, amt, dec) => {
            await deposit(sym, amt, dec);
            setSheetOpen(false);
          }}
        />
      )}

      <FlowBanner flow={flow} onDismiss={resetFlow} />
    </div>
  );
}
