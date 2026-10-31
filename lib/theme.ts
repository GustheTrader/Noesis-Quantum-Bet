export type ModelTheme = 'dark-matter' | 'cyber-light' | 'neon-matrix';

export interface ThemeDefinition {
  id: ModelTheme;
  name: string;
  tagline: string;
  badge: string;
  description: string;
  accentColor: string;
  previewBg: string;
  variables: Record<string, string>;
}

export const THEME_CONFIGS: Record<ModelTheme, ThemeDefinition> = {
  'dark-matter': {
    id: 'dark-matter',
    name: 'Dark Matter',
    tagline: 'Deep Cosmic Obsidian',
    badge: 'DEFAULT',
    description: 'High-density obsidian glass with deep violet undertones, subtle light refraction, and dark telemetry focus.',
    accentColor: '#8b5cf6',
    previewBg: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.75))',
    variables: {
      '--glass-bg': 'rgba(15, 23, 42, 0.72)',
      '--glass-blur': '14px',
      '--glass-border': '1px solid rgba(139, 92, 246, 0.3)',
      '--glass-border-color': 'rgba(139, 92, 246, 0.3)',
      '--glass-shadow': '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      '--glass-glow': '0 0 25px rgba(139, 92, 246, 0.2)',
      '--glass-highlight': 'rgba(139, 92, 246, 0.15)',
      '--glass-text-color': '#ffffff',
    }
  },
  'cyber-light': {
    id: 'cyber-light',
    name: 'Cyber Light',
    tagline: 'Luminescent Holographic Frost',
    badge: 'HOLO',
    description: 'High-luminescence holographic frosted glass with crisp electric cyan borders, elevated reflection, and ambient photon glow.',
    accentColor: '#06b6d4',
    previewBg: 'linear-gradient(135deg, rgba(220, 240, 255, 0.3), rgba(6, 182, 212, 0.25))',
    variables: {
      '--glass-bg': 'rgba(215, 235, 255, 0.18)',
      '--glass-blur': '18px',
      '--glass-border': '1px solid rgba(6, 182, 212, 0.55)',
      '--glass-border-color': 'rgba(6, 182, 212, 0.55)',
      '--glass-shadow': '0 8px 32px 0 rgba(6, 182, 212, 0.25), inset 0 1px 2px 0 rgba(255, 255, 255, 0.45)',
      '--glass-glow': '0 0 35px rgba(6, 182, 212, 0.4)',
      '--glass-highlight': 'rgba(6, 182, 212, 0.3)',
      '--glass-text-color': '#ffffff',
    }
  },
  'neon-matrix': {
    id: 'neon-matrix',
    name: 'Neon Matrix',
    tagline: 'Phosphor Quantum Grid',
    badge: 'ALPHA',
    description: 'Terminal-grade phosphorescent glass with cyber emerald highlights, deep matrix polarization, and high-frequency scan aesthetics.',
    accentColor: '#10b981',
    previewBg: 'linear-gradient(135deg, rgba(6, 28, 20, 0.9), rgba(16, 185, 129, 0.3))',
    variables: {
      '--glass-bg': 'rgba(6, 28, 20, 0.7)',
      '--glass-blur': '14px',
      '--glass-border': '1px solid rgba(16, 185, 129, 0.45)',
      '--glass-border-color': 'rgba(16, 185, 129, 0.45)',
      '--glass-shadow': '0 8px 32px 0 rgba(16, 185, 129, 0.2), inset 0 1px 0 0 rgba(52, 211, 153, 0.25)',
      '--glass-glow': '0 0 30px rgba(16, 185, 129, 0.3)',
      '--glass-highlight': 'rgba(16, 185, 129, 0.22)',
      '--glass-text-color': '#ecfdf5',
    }
  }
};

export const THEME_STORAGE_KEY = 'quantum_model_theme';

export function getStoredTheme(): ModelTheme {
  if (typeof window === 'undefined') return 'dark-matter';
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ModelTheme | null;
  if (saved && THEME_CONFIGS[saved]) {
    return saved;
  }
  return 'dark-matter';
}

export function applyModelTheme(theme: ModelTheme): void {
  if (typeof window === 'undefined') return;
  const config = THEME_CONFIGS[theme] || THEME_CONFIGS['dark-matter'];
  
  // Set data-theme attribute on documentElement
  document.documentElement.setAttribute('data-model-theme', theme);
  
  // Dynamically set CSS variables on documentElement root
  const rootStyle = document.documentElement.style;
  Object.entries(config.variables).forEach(([prop, val]) => {
    rootStyle.setProperty(prop, val);
  });
  
  // Persist preference
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  
  // Dispatch custom event for reactive subscribers
  window.dispatchEvent(new CustomEvent('model-theme-changed', { detail: { theme, config } }));
}

// Auto-initialize theme on load
if (typeof window !== 'undefined') {
  const initialTheme = getStoredTheme();
  applyModelTheme(initialTheme);
}
