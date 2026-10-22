import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Legal-pad background: horizontal rules every `lineHeight` px, the first at `firstRule`, plus a
 * double margin line on the left. Render it as the ScrollView's content so the rules
 * scroll with the text. Children must stack in multiples of `lineHeight` (set each text
 * element's lineHeight to it, with no vertical margins) for the writing to sit on the lines.
 */
export function RuledPaper({
  lineHeight,
  firstRule,
  marginX,
  lineColor,
  marginColor,
  style,
  children,
}: {
  lineHeight: number;
  /** y (from the paper's top) of the first rule; the rest follow every `lineHeight`. */
  firstRule: number;
  marginX: number;
  lineColor: string;
  marginColor: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [height, setHeight] = useState(0);
  const count = Math.max(0, Math.ceil((height - firstRule) / lineHeight));

  return (
    <View style={style} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            style={[styles.rule, { top: firstRule + lineHeight * i, backgroundColor: lineColor }]}
          />
        ))}
        <View style={[styles.margin, { left: marginX, backgroundColor: marginColor }]} />
        <View style={[styles.margin, { left: marginX + 3, backgroundColor: marginColor }]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { position: 'absolute', left: 0, right: 0, height: 1 },
  margin: { position: 'absolute', top: 0, bottom: 0, width: 1 },
});
