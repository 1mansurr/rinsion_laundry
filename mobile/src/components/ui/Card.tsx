import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

// White bordered rounded card — the website's most common surface pattern
// (bg-white border border-warm-300 rounded-18) on top of the canvas background.
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.backgroundSelected,
    borderRadius: Radius.lg,
    padding: 16,
  },
});
