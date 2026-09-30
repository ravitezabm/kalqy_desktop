import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface Props {
  children: ReactNode;
  resetKey: string;
}

interface State {
  error: Error | null;
}

class Boundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Screen crashed:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ padding: 32, fontFamily: "sans-serif", color: "#222" }}>
        <h1 style={{ marginTop: 0 }}>Something went wrong on this screen</h1>
        <p>Please go back and try again. If it keeps happening, tell support@kalqy.in what you were doing.</p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.7 }}>{this.state.error.message}</pre>
        <button type="button" onClick={() => (window.location.hash = "#/home")} style={{ padding: "10px 20px" }}>
          Go to Home
        </button>
      </div>
    );
  }
}

/** Turns a render crash into a readable message instead of a blank white window; resets on navigation. */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
}
