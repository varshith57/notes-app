// Palette: white canvas, cream surfaces, burgundy for actions and selection, gold for
// highlights and progress, near-black for text and chrome, warm grey for borders.
// Gold is never used for text on light backgrounds (fails contrast) — use goldDark.
export const palette = {
  burgundy: '#6A0C1F',
  gold: '#C8A24A',
  cream: '#F6F1E7',
  black: '#0F0D0E',
  grey: '#B3A7A0',
  white: '#FFFFFF',
};

export const colors = {
  background: palette.white,
  surface: palette.cream,
  surfaceStrong: '#EFE7D8',
  text: palette.black,
  /** Secondary text — a darkened palette grey that stays readable (≈6:1 on white). */
  muted: '#6E6461',
  placeholder: '#9A8F89',
  border: '#E7E0D6',
  grey: palette.grey,
  chrome: palette.black,
  primary: palette.burgundy,
  primarySoft: '#F4E7E9',
  gold: palette.gold,
  goldDark: '#8F6E24',
  goldSoft: '#F7EED9',
  onPrimary: palette.white,
  // Semantic money colours stay green/red: users read them instantly.
  income: '#2E7D4F',
  incomeSoft: '#E4F1E8',
  expense: '#B42318',
  expenseSoft: '#FBE9E7',
  danger: '#B42318',
};

/** Primary action fill (buttons, FAB, selected day, active tab). */
export const gradient = ['#8E1B33', palette.burgundy] as const;
export const goldGradient = ['#DDBE70', palette.gold] as const;
export const progressGradient = [palette.gold, palette.burgundy] as const;

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
  high: palette.burgundy,
  medium: palette.gold,
  low: palette.grey,
} as const;
