// Light/dark theme. The inline script in Base.astro applies the stored choice before first
// paint; this module changes and persists it.
export type Theme = 'light' | 'dark';
const KEY = 'woksin:theme';

export const currentTheme = (): Theme => (document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark');

export function setTheme(theme: Theme): Theme {
  const root = document.documentElement;
  root.classList.add('theme-flip');
  window.setTimeout(() => root.classList.remove('theme-flip'), 450);
  root.dataset['theme'] = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f7f5f1' : '#08090c');
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage may be unavailable */
  }
  document.dispatchEvent(new CustomEvent('theme:change', { detail: theme }));
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(theme === 'light')));
  return theme;
}

export const toggleTheme = (): Theme => setTheme(currentTheme() === 'light' ? 'dark' : 'light');
