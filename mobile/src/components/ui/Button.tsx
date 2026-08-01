import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'destructive';

interface Props extends PressableProps {
  variant?: Variant;
  isPending?: boolean;
  children: string;
}

// Mirrors src/components/ui/Button.tsx on the website (same variant colors) —
// only the variants actually used by the app's current screens.
export function Button({ variant = 'primary', isPending = false, disabled, children, style, ...rest }: Props) {
  const isDisabled = disabled || isPending;
  return (
    <Pressable
      disabled={isDisabled}
      style={[styles.base, VARIANT_STYLES[variant], isDisabled && styles.disabled, style as object]}
      {...rest}
    >
      {isPending ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.card : Colors.brand} />
      ) : (
        <ThemedText style={[styles.text, TEXT_STYLES[variant]]}>{children}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

const VARIANT_STYLES: Record<Variant, object> = {
  primary: { backgroundColor: Colors.brand },
  secondary: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.backgroundSelected },
  destructive: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.error.border },
};

const TEXT_STYLES: Record<Variant, object> = {
  primary: { color: Colors.card },
  secondary: { color: Colors.text },
  destructive: { color: Colors.error.fg },
};
