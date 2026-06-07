// Helper Telegram Mini App + parsing deep-link payload dari Mira.
// Mira bridge: t.me/<bot>?startapp=<payload>  -> tersedia di initDataUnsafe.start_param

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initDataUnsafe?: { start_param?: string; user?: { id: number; first_name: string } };
  themeParams?: Record<string, string>;
  colorScheme?: "light" | "dark";
  HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void };
}

export function getTelegram(): TelegramWebApp | null {
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp ?? null;
}

export function initTelegram(): void {
  const tg = getTelegram();
  if (!tg) return;
  tg.ready();
  tg.expand();
}

/** Konteks yang dibawa dari Mira lewat deep-link (mis. tujuan tabungan). */
export interface MiraPayload {
  action?: "deposit" | "withdraw" | "goal";
  amountUsd?: number;
  goalUsd?: number;
}

export function readMiraPayload(): MiraPayload | null {
  const tg = getTelegram();
  const raw = tg?.initDataUnsafe?.start_param;
  if (!raw) return null;
  try {
    // payload di-encode base64url JSON oleh skill Mira (lihat mira-skills/nabung.md)
    const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as MiraPayload;
  } catch {
    return null;
  }
}

export function haptic(kind: "success" | "error" | "light" = "light"): void {
  const tg = getTelegram();
  if (!tg?.HapticFeedback) return;
  if (kind === "light") tg.HapticFeedback.impactOccurred("light");
  else tg.HapticFeedback.notificationOccurred(kind);
}
