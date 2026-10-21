// Palette follows the Refleq reference: white canvas, pastel cards, deep-navy tab bar,
// and a lavender → peach gradient for the active/hero elements.
export const colors = {
  background: '#FFFFFF',
  surface: '#F5F4F9',
  text: '#1A1033',
  muted: '#7A7590',
  border: '#ECEAF3',
  navy: '#1E0B4B',
  primary: '#8B5CF6',
  lavender: '#B79BF7',
  sunny: '#F5C14B',
  income: '#16A34A',
  expense: '#E5484D',
  danger: '#E5484D',
};

export const gradient = ['#B79BF7', '#F4A6C6', '#F7B267'] as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const NOTE_COLORS = {
  lavender: { background: '#EFE8FF', accent: '#8B5CF6', label: 'Lavender' },
  sunny: { background: '#FFF4D6', accent: '#D99A00', label: 'Sunny' },
  sky: { background: '#E3F1FF', accent: '#2F8CF0', label: 'Sky' },
  rose: { background: '#FFE6F1', accent: '#F0508F', label: 'Rose' },
  mint: { background: '#E1F6EA', accent: '#1F9D5C', label: 'Mint' },
} as const;

export type NoteColor = keyof typeof NOTE_COLORS;
export const NOTE_COLOR_KEYS = Object.keys(NOTE_COLORS) as NoteColor[];

export const PRIORITY_COLORS = {
  high: '#F0508F',
  medium: '#F5A524',
  low: '#2F8CF0',
} as const;
