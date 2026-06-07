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

function b64url(obj: object): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Deep-link KE @mira dengan konteks tabungan (jembatan keluar ke asisten AI). */
export function miraStartLink(payload: object): string {
  return `https://t.me/mira?start=${b64url(payload)}`;
}

/** Link share native Telegram untuk membagikan progres tabungan. */
export function shareProgressLink(text: string, url = "https://nabung-two.vercel.app"): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

/** Buka t.me link via Telegram bila di dalam Mini App, jika tidak via tab baru. */
export function openTelegram(url: string): void {
  const tg = getTelegram() as unknown as { openTelegramLink?: (u: string) => void };
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.open(url, "_blank");
}

export function haptic(kind: "success" | "error" | "light" = "light"): void {
  const tg = getTelegram();
  if (!tg?.HapticFeedback) return;
  if (kind === "light") tg.HapticFeedback.impactOccurred("light");
  else tg.HapticFeedback.notificationOccurred(kind);
}
