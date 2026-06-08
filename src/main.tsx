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

// Render errors must NOT produce a silent black screen — show the message instead.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: "#f87171", background: "#0f1115", padding: 16, whiteSpace: "pre-wrap", minHeight: "100vh", margin: 0, fontSize: 12 }}>
          Nabung crashed:{"\n"}
          {String(this.state.error.stack || this.state.error.message || this.state.error)}
        </pre>
      );
    }
    return this.props.children;
  }
}

// In LIVE mode, wrap with OmnistonProvider (provides the instance to useRfq/useOmniston).
// In MOCK mode, skip it so the demo runs without a WebSocket connection.
function Root() {
  if (MOCK) return <App />;
  const omniston = new Omniston({ apiUrl: OMNISTON_WS });
  return (
    <OmnistonProvider omniston={omniston}>
      <App />
    </OmnistonProvider>
  );
}

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
          <Root />
        </TonConnectUIProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (e) {
  const el = document.getElementById("root");
  if (el) el.innerHTML = `<pre style="color:#f87171;padding:16px;white-space:pre-wrap">Mount failed: ${String((e as Error)?.stack || e)}</pre>`;
}
