import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { STATUS_LABELS } from '@/constants/statuses';

// Mirrors tailwind.config.ts's `status` color group and
// src/components/app/StatusBadge.tsx on the website.
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  received: { bg: '#EEEAE3', fg: '#5A5249' },
  processing: { bg: '#F7EFD9', fg: '#7A5512' },
  ready: { bg: '#E3EDE8', fg: '#0F3D2E' },
  collected: { bg: '#EAEDE9', fg: '#4F6256' },
  cancelled: { bg: '#F4E3E1', fg: '#8A322C' },
};

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.received;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <ThemedText type="small" style={{ color: colors.fg, fontWeight: '600' }}>
        {STATUS_LABELS[status] ?? status}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
