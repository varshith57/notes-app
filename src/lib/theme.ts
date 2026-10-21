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

export interface NoteTone {
  label: string;
  background: string;
  /** Body and title text; every pair is ≥ 7:1 contrast. */
  text: string;
  /** Secondary text (previews, "Edited …"). */
  muted: string;
  placeholder: string;
  /** Ruled lines on the paper. */
  rule: string;
  /** Margin line on the paper. */
  margin: string;
  /** Date pill / pin colour, and the text that sits on it. */
  accent: string;
  onAccent: string;
  /** Dark notes need light status-bar icons. */
  dark: boolean;
}

// The five note colours are the app palette itself. Cream and gold take black ink, grey
// takes burgundy ink, and the dark papers (burgundy, black) take bright cream ink with
// cream-tinted secondary text so nothing reads as dull.
export const NOTE_COLORS = {
  cream: {
    label: 'Cream',
    background: palette.cream,
    text: palette.black,
    muted: '#6E6461',
    placeholder: '#9A8F89',
    rule: 'rgba(179,167,160,0.45)',
    margin: 'rgba(106,12,31,0.35)',
    accent: palette.burgundy,
    onAccent: palette.white,
    dark: false,
  },
  gold: {
    label: 'Gold',
    background: palette.gold,
    text: palette.black,
    muted: '#3D3226',
    placeholder: '#6B5A38',
    rule: 'rgba(15,13,14,0.16)',
    margin: 'rgba(106,12,31,0.5)',
    accent: palette.burgundy,
    onAccent: palette.white,
    dark: false,
  },
  grey: {
    label: 'Grey',
    background: palette.grey,
    text: palette.burgundy,
    muted: '#4E0816',
    placeholder: 'rgba(106,12,31,0.6)',
    rule: 'rgba(106,12,31,0.18)',
    margin: 'rgba(106,12,31,0.5)',
    accent: palette.burgundy,
    onAccent: palette.cream,
    dark: false,
  },
  burgundy: {
    label: 'Burgundy',
    background: palette.burgundy,
    text: palette.cream,
    muted: 'rgba(246,241,231,0.85)',
    placeholder: 'rgba(246,241,231,0.6)',
    rule: 'rgba(246,241,231,0.16)',
    margin: 'rgba(200,162,74,0.55)',
    accent: palette.gold,
    onAccent: palette.black,
    dark: true,
  },
  black: {
    label: 'Black',
    background: palette.black,
    text: palette.cream,
    muted: 'rgba(246,241,231,0.85)',
    placeholder: 'rgba(246,241,231,0.55)',
    rule: 'rgba(246,241,231,0.14)',
    margin: 'rgba(200,162,74,0.45)',
    accent: palette.gold,
    onAccent: palette.black,
    dark: true,
  },
} as const satisfies Record<string, NoteTone>;

export type NoteColor = keyof typeof NOTE_COLORS;
export const NOTE_COLOR_KEYS = Object.keys(NOTE_COLORS) as NoteColor[];
export const DEFAULT_NOTE_COLOR: NoteColor = 'cream';

/** Tone for a stored colour key, falling back to the default for unknown values. */
export function noteTone(color: string): NoteTone {
  return NOTE_COLORS[color as NoteColor] ?? NOTE_COLORS[DEFAULT_NOTE_COLOR];
}

export const PRIORITY_COLORS = {
  high: palette.burgundy,
  medium: palette.gold,
  low: palette.grey,
} as const;
