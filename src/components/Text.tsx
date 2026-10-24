import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { useTextScale } from '@/lib/textScale';

// The app's Text and TextInput: React Native's, with font sizes (and line heights) scaled by
// the A− / A+ text size in Settings, so the setting applies across every screen. Use these
// instead of importing Text / TextInput from react-native.

function scaleStyle(style: StyleProp<TextStyle>, scale: number): StyleProp<TextStyle> {
  if (scale === 1) return style;
  const { fontSize, lineHeight } = StyleSheet.flatten(style) ?? {};
  // No font size: a nested Text inherits its parent's, which is already scaled.
  if (fontSize == null) return style;
  return [
    style,
    {
      fontSize: Math.round(fontSize * scale),
      ...(lineHeight != null ? { lineHeight: Math.round(lineHeight * scale) } : {}),
    },
  ];
}

export function Text({ style, ...props }: TextProps) {
  const scale = useTextScale();
  return <RNText {...props} style={scaleStyle(style, scale)} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  const scale = useTextScale();
  return <RNTextInput {...props} style={scaleStyle(style, scale)} />;
}
