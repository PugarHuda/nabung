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
  import.meta.env.VITE_MANIFEST_URL ??
  `${window.location.origin}${import.meta.env.BASE_URL}tonconnect-manifest.json`;

// In LIVE mode, wrap with OmnistonProvider (provides the instance to useRfq/useOmniston).
// In MOCK mode, skip it so the demo runs without a WebSocket connection.
// (Importing the module doesn't open a connection; only `new Omniston()` connects.)
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
