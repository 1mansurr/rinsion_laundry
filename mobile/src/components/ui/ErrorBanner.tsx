import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';

// Mirrors the website's red-50/red-200/red-700 error banner pattern, using
// the design system's actual error tokens instead of raw Tailwind reds.
export function ErrorBanner({ message }: { message: string }) {
  return (
    <ThemedText style={styles.banner}>{message}</ThemedText>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.error.bg,
    borderWidth: 1,
    borderColor: Colors.error.border,
    color: Colors.error.fg,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
