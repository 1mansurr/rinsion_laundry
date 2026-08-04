// Temporary kill switches for features that are code-complete but paused for
// business reasons — flip back to true to re-enable, no other changes
// needed. Remove the flag entirely once it's no longer serving a purpose.

// Hides the Orders/Requests segmented toggle (and blocks direct navigation
// to /pickup-requests) regardless of a laundry's allowCustomerSubmissions
// setting. Requested 2026-08-04.
export const PICKUP_REQUESTS_UI_ENABLED = false
