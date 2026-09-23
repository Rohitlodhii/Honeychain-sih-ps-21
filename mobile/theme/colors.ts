const lightColors = {
  background: '#FFFFFF', foreground: '#000000', card: '#F2F2F7', cardForeground: '#000000',
  popover: '#F2F2F7', popoverForeground: '#000000', primary: '#18181b', primaryForeground: '#FFFFFF',
  secondary: '#F2F2F7', secondaryForeground: '#18181b', muted: '#78788033', mutedForeground: '#71717a',
  accent: '#F2F2F7', accentForeground: '#18181b', destructive: '#ef4444', destructiveForeground: '#FFFFFF',
  border: '#C6C6C8', input: '#e4e4e7', ring: '#a1a1aa', text: '#000000', textMuted: '#71717a',
  tint: '#18181b', icon: '#71717a', tabIconDefault: '#71717a', tabIconSelected: '#18181b',
  blue: '#007AFF', green: '#34C759', red: '#FF3B30', orange: '#FF9500', yellow: '#FFCC00',
  pink: '#FF2D92', purple: '#AF52DE', teal: '#5AC8FA', indigo: '#5856D6',
  success: '#22c55e', successForeground: '#ffffff', warning: '#f59e0b', warningForeground: '#ffffff',
  info: '#3b82f6', infoForeground: '#ffffff', error: '#ef4444', errorForeground: '#ffffff',
};

const darkColors = {
  background: '#000000', foreground: '#FFFFFF', card: '#1C1C1E', cardForeground: '#FFFFFF',
  popover: '#18181b', popoverForeground: '#FFFFFF', primary: '#e4e4e7', primaryForeground: '#18181b',
  secondary: '#1C1C1E', secondaryForeground: '#FFFFFF', muted: '#78788033', mutedForeground: '#a1a1aa',
  accent: '#1C1C1E', accentForeground: '#FFFFFF', destructive: '#dc2626', destructiveForeground: '#FFFFFF',
  border: '#38383A', input: 'rgba(255, 255, 255, 0.15)', ring: '#71717a', text: '#FFFFFF', textMuted: '#a1a1aa',
  tint: '#FFFFFF', icon: '#a1a1aa', tabIconDefault: '#a1a1aa', tabIconSelected: '#FFFFFF',
  blue: '#0A84FF', green: '#30D158', red: '#FF453A', orange: '#FF9F0A', yellow: '#FFD60A',
  pink: '#FF375F', purple: '#BF5AF2', teal: '#64D2FF', indigo: '#5E5CE6',
  success: '#16a34a', successForeground: '#ffffff', warning: '#d97706', warningForeground: '#ffffff',
  info: '#2563eb', infoForeground: '#ffffff', error: '#dc2626', errorForeground: '#ffffff',
};

export const Colors = { light: lightColors, dark: darkColors };
export { darkColors, lightColors };
export type ColorKeys = keyof typeof lightColors;

export const withOpacity = (color: string, opacity: number) => {
  if (color.startsWith('rgba')) return color;
  if (!color.startsWith('#')) return color;
  const hex = color.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
