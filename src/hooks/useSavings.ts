import { useCallback, useEffect, useState } from "react";
import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { readPosition } from "@/lib/ston";
import { deposit as runDeposit, withdraw as runWithdraw } from "@/lib/savings";
import { getUsdPrice } from "@/lib/api";
import type { ConversionQuote, FlowState, SavingsPosition } from "@/types";
import { haptic } from "@/telegram";

const VALIDITY = 60_000;

export function useSavings() {
  const wallet = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [position, setPosition] = useState<SavingsPosition | null>(null);
  const [flow, setFlow] = useState<FlowState>({ status: "idle" });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!wallet) return setPosition(null);
    setLoading(true);
    try {
      // on-chain = sumber kebenaran
      setPosition(await readPosition(wallet));
    } catch {
      setPosition(null);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sign = useCallback(
    async (txs: { to: string; value: string; body?: string }[]) => {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + VALIDITY / 1000,
        messages: txs.map((t) => ({ address: t.to, amount: t.value, payload: t.body })),
      });
    },
    [tonConnectUI],
  );

  const deposit = useCallback(
    async (fromSymbol: string, amount: number, decimals: number) => {
      if (!wallet) return;
      const { price } = await getUsdPrice(fromSymbol);
      await runDeposit({
        wallet,
        fromSymbol,
        fromUnits: Math.floor(amount * 10 ** decimals).toString(),
        fromDecimals: decimals,
        fromUsd: amount * price,
        sign,
        onState: (s) => {
          setFlow(s);
          if (s.status === "done") haptic("success");
          if (s.status === "error") haptic("error");
        },
        confirm: async (_q: ConversionQuote) =>
          window.confirm("Rate berubah sejak tadi. Lanjut menabung dengan rate terbaru?"),
      });
      await refresh();
    },
    [wallet, sign, refresh],
  );

  const withdraw = useCallback(async () => {
    if (!wallet || !position) return;
    await runWithdraw({ wallet, lpShares: position.lpShares, sign, onState: setFlow });
    await refresh();
  }, [wallet, position, sign, refresh]);

  return { wallet, position, flow, loading, deposit, withdraw, refresh, resetFlow: () => setFlow({ status: "idle" }) };
}
