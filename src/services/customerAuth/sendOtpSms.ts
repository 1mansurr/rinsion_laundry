'use server'

import { smsProvider } from '@/lib/sms'

/**
 * Sends a customer login/signup OTP directly via the SMS provider, bypassing
 * the sendSms()/sendSystemSms() chokepoint (services/notifications/sendSms.ts)
 * entirely — those require a laundryId for quota lookup and sms_messages
 * logging, but a customer requesting a login code has no laundry context yet
 * and nothing to bill this send to.
 */
export async function sendOtpSms(phone: string, code: string): Promise<{ success: boolean }> {
  const result = await smsProvider.sendSms(
    phone,
    `Your Rinsion verification code is ${code}. It expires in 10 minutes.`,
    'Rinsion'
  )
  return { success: result.success }
}
