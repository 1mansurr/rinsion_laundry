import { Colors } from '@/constants/theme';

// Single brand palette, no light/dark split — see constants/theme.ts's own
// comment on why. Kept as a hook (not a plain import) so screens don't need
// to change if a real dark variant ever gets designed later.
export function useTheme() {
  return Colors;
}
