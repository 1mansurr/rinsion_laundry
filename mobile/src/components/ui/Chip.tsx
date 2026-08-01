import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';

interface Props extends PressableProps {
  selected?: boolean;
  children: string;
}

export function Chip({ selected = false, children, style, ...rest }: Props) {
  return (
    <Pressable style={[styles.chip, selected && styles.selected, style as object]} {...rest}>
      <ThemedText type="small" style={selected && { color: Colors.card }}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: Colors.backgroundSelected,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.card,
  },
  selected: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
});
