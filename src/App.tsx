import { MotionConfig } from "framer-motion";
import { HashRouter } from "react-router-dom";
import { AppRoutes } from "./router/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";

/**
 * Applies settings that need to take effect application-wide, outside of
 * whichever screen happens to be mounted. Split from App so it can read
 * SettingsContext (which App itself sits above).
 */
function AppEffects({ children }: { children: React.ReactNode }) {
  const { reduceAnimations, largerUI } = useSettings();

  return (
    <MotionConfig reducedMotion={reduceAnimations ? "always" : "user"}>
      <div
        style={
          largerUI
            ? // WebKit-only, but Tauri's macOS/Windows webviews are WebKit-based,
              // so this genuinely scales the whole app rather than only text.
              ({ zoom: 1.15 } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
    </MotionConfig>
  );
}

function App() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <SettingsProvider>
          <AppEffects>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </AppEffects>
        </SettingsProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}

export default App;
