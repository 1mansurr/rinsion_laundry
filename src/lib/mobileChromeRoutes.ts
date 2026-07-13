// Routes that render their own full-height layout (a sticky form summary bar,
// onboarding's footer nav) and don't want the global bottom tab bar — or its
// reserved scroll padding — competing for the same screen real estate.
const TAB_BAR_HIDDEN_ROUTES = ['/orders/new', '/onboarding']

export function isTabBarHiddenRoute(pathname: string): boolean {
  return TAB_BAR_HIDDEN_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}
