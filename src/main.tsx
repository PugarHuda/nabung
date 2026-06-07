import React from "react";
import ReactDOM from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { Omniston } from "@ston-fi/omniston-sdk";
import { OmnistonProvider } from "@ston-fi/omniston-sdk-react";
import App from "./App";
import { initTelegram } from "./telegram";
import { MOCK, OMNISTON_WS } from "./config";
import "./styles.css";

initTelegram();

const MANIFEST_URL =
  import.meta.env.VITE_MANIFEST_URL ?? `${window.location.origin}/tonconnect-manifest.json`;

// Di mode LIVE, bungkus dengan OmnistonProvider (menyediakan instance ke useRfq/useOmniston).
// Di mode MOCK, lewati supaya demo tetap jalan tanpa koneksi WebSocket.
// (Mengimpor modul tidak memicu koneksi; hanya `new Omniston()` yang connect.)
function Root() {
  if (MOCK) return <App />;
  const omniston = new Omniston({ apiUrl: OMNISTON_WS });
  return (
    <OmnistonProvider omniston={omniston}>
      <App />
    </OmnistonProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <Root />
    </TonConnectUIProvider>
  </React.StrictMode>,
);
