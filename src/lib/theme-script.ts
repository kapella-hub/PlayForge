export const THEME_STORAGE_KEY = "playforge-theme";

/**
 * Pure theme resolver — the single source of truth for the pre-hydration
 * decision. Mirrors theme-provider.tsx: stored `dark | light | system`
 * (default dark); `system` resolves via prefers-color-scheme; anything
 * unrecognised falls back to dark.
 */
export function resolveThemeClass(
  stored: string | null,
  prefersDark: boolean,
): "dark" | "light" {
  const theme = stored ?? "dark";
  if (theme === "light") return "light";
  if (theme === "system") return prefersDark ? "dark" : "light";
  return "dark";
}

/**
 * Self-invoking snippet injected inline (dangerouslySetInnerHTML) as the first
 * child of <body>. It runs before body content paints and sets the theme class
 * on <html>, preventing a flash. It mirrors resolveThemeClass exactly; the
 * theme-script drift test executes this and verifies it against the resolver.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var stored=t==null?'dark':t;var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=stored==='light'?'light':(stored==='system'?(d?'dark':'light'):'dark');var c=document.documentElement.classList;c.remove('dark','light');c.add(r);}catch(e){document.documentElement.classList.add('dark');}})();`;
