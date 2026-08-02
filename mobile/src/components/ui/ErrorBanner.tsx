import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';

// Mirrors the website's red-50/red-200/red-700 error banner pattern, using
// the design system's actual error tokens instead of raw Tailwind reds.
export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <View style={[styles.banner, onDismiss && styles.bannerRow]}>
      <ThemedText style={{ color: Colors.error.fg, flex: 1 }}>{message}</ThemedText>
      {onDismiss && (
        <Pressable onPress={onDismiss}>
          <ThemedText style={{ color: Colors.error.fg, fontWeight: '600' }}>Dismiss</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.error.bg,
    borderWidth: 1,
    borderColor: Colors.error.border,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
