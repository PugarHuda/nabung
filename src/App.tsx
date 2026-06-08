import { useEffect, useMemo, useState } from "react";
import { TonConnectButton } from "@tonconnect/ui-react";
import { useSavings } from "@/hooks/useSavings";
import {
  BalanceCard,
  DepositSheet,
  AssistantTips,
  RiskNote,
  GoalCard,
  FlowBanner,
  HowItWorks,
  MiraReportPreview,
  MiraActions,
} from "@/components";
import { readMiraPayload } from "@/telegram";
import { getUsdtPriceLive } from "@/lib/api";
import { MOCK, IS_TESTNET, setAppMode } from "@/config";

export default function App() {
  const { wallet, position, flow, deposit, withdraw, resetFlow } = useSavings();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Context from Mira (deep-link): e.g. open straight to deposit / set a goal.
  const mira = useMemo(() => readMiraPayload(), []);

  // REAL data from STON.fi: USDT peg (proves the savings asset is stable). Live + safe fallback.
  const [meta, setMeta] = useState<{ usdtPeg?: number }>({});
  useEffect(() => {
    let alive = true;
    getUsdtPriceLive().then((usdtPeg) => {
      if (alive) setMeta({ usdtPeg });
    });
    return () => {
      alive = false;
    };
  }, []);

  // DEMO: make the balance feel "alive" — interest ticks up slowly during a presentation.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!MOCK || !position) return;
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, [position]);
  const shown = position
    ? {
        ...position,
        balanceUsd: position.balanceUsd + tick * 0.01,
        earnedUsd: position.earnedUsd + tick * 0.01,
      }
    : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🐷</span>
          <div>
            <h1>Nabung</h1>
            <p className="tagline">Crypto savings, as simple as chat.</p>
          </div>
        </div>
        <TonConnectButton />
      </header>

      {MOCK && (
        <div className="mock-pill" style={{ cursor: "pointer" }} onClick={() => setAppMode("testnet")}>
          DEMO MODE — simulated · <u>tap to switch to TESTNET (real tx)</u>
        </div>
      )}
      {!MOCK && IS_TESTNET && (
        <div className="mock-pill testnet" style={{ cursor: "pointer" }} onClick={() => setAppMode("demo")}>
          TESTNET — real on-chain txs · yield simulated · <u>tap for Demo</u>
        </div>
      )}

      {!wallet ? (
        <section className="empty">
          <p className="big">Set aside, let it grow. 🌱</p>
          <p className="muted">
            Deposit any token — we convert it to stable USDT and save it somewhere low-risk.
            Connect your wallet to start.
          </p>
          <HowItWorks />
          <RiskNote />
        </section>
      ) : (
        <main className="stack">
          <BalanceCard position={shown} usdtPeg={meta.usdtPeg} />

          <div className="actions">
            <button className="primary" onClick={() => setSheetOpen(true)}>
              ＋ Deposit
            </button>
            <button className="ghost" disabled={!position} onClick={withdraw}>
              Withdraw
            </button>
          </div>

          <GoalCard position={shown} miraGoalUsd={mira?.goalUsd} />
          <MiraReportPreview position={shown} />
          <MiraActions position={shown} />
          <AssistantTips position={shown} />
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
