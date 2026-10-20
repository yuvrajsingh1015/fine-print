import { useState } from "react";
import type { Strings } from "../i18n";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export default function ThemeToggle({ t }: { t: Strings }) {
  const [light, setLight] = useState(() => document.documentElement.classList.contains("light"));

  function toggle() {
    const next = !light;
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      // storage blocked (e.g. private mode): theme still switches, just isn't remembered
    }
    setLight(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? t.themeToDark : t.themeToLight}
      title={light ? t.themeToDark : t.themeToLight}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-accent"
    >
      {light ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
