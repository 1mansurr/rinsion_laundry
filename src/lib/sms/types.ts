/**
 * lib/sms/types.ts
 *
 * Provider-agnostic SMS interface. Service functions target this interface;
 * mNotify-specific code stays inside lib/sms/mnotify.ts.
 *
 * Spec reference: Rinsion_Technical_Overview.md §11, Rinsion_Project_Folder_Structure.md → Lib Folder
 */

export interface SmsProvider {
  sendSms(phoneNumber: string, message: string, senderId: string): Promise<SmsResult>
}

export interface SmsResult {
  success: boolean
  providerMessageId?: string
  errorMessage?: string
}
