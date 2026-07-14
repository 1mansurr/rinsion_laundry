# Rinsion Privacy Policy

**Status: DRAFT (v3), pending review by a qualified Ghanaian lawyer. Do not publish until the `[CONFIRM: …]` items below are resolved and the draft has been reviewed.**

**Effective date:** [FILL: date this is published/becomes binding]
**Last updated:** 2026-07-14

---

## 1. Who we are

Rinsion is a laundry management platform used by laundries and dry cleaners to manage orders, customers, payments, and notifications.

Rinsion is operated by **Alidu Yakubu Suhyini Mansur** as an individual based in Ghana ("Rinsion", "we", "us", "our"). We have not yet registered a company. You can contact us about this policy at **saymmmohamm265@gmail.com** (or, once live, **support@rinsion.com**).

We intend to complete any registration required under the Data Protection Act, 2012 (Act 843), including registration as a data controller where applicable, before commercial launch. Once registered, our registration details will be published here.

> [CONFIRM: if you register a limited liability company, replace the operator details with the company name, registration number, and registered address. Note for your lawyer: two people operating together without registration may be treated as a partnership, which can create joint personal liability.]

## 2. Who this policy covers, and the two roles we play

Rinsion is business software. The people who hold accounts are **laundry owners, administrators, and employees**, not the laundry's own walk-in customers.

Because of this, we handle personal data in two different roles:

- **As a controller.** For the account holders above (laundry staff), we decide how and why their data is used. This policy governs that data.
- **As a processor.** A laundry uses Rinsion to store data about *its own* customers (names, phone numbers, order history). That data belongs to the laundry. The laundry decides how it is used; we process it only on the laundry's behalf to run the service. Our obligations for that data are set out in our Terms of Service (the "Data Processing" section). If you are a customer of a laundry and want your data corrected or removed, please contact that laundry directly, since they control it.

## 3. What we collect

We only collect what the service needs to work. We do **not** collect IP addresses, browser or device information, location data, advertising identifiers, or card numbers.

**From account holders (laundry staff):**
- First and last name
- Phone number (your primary login identity, stored in international format, e.g. +233…)
- Email address (optional; some staff are invited by phone only and never provide one)
- Role (admin or employee) and active or inactive status
- A securely hashed password (we never store or see your actual password; see Section 8)
- A record of significant actions you take in the system (activity logs), which reference the staff member and order involved

**Collected during sign-up or invitation, before an account exists:**
- Self sign-up requests: name, email, phone
- Staff invitations: phone number and assigned role

**On behalf of laundries (data we process, not control):**
- The laundry's customers' names and phone numbers
- Orders, items, pricing, and payment records
- A log of the SMS messages the system sends, including the recipient's phone number and the message text

We do not sell personal data, and we do not use it for advertising. Selling personal data is a serious offence under Ghanaian law, and we will never do it.

## 4. How we use data

We use account-holder data to:
- Create and secure your account and log you in
- Provide the platform and its features
- Send you service and subscription-related messages
- Keep activity and audit records for accountability and dispute resolution
- Manage billing and subscriptions
- Detect, prevent, and respond to security or misuse issues

We process laundry-customer data solely to deliver the features the laundry uses, for example generating an order, sending a pickup-code SMS, or letting staff look up an order.

## 5. SMS notifications

SMS messages are delivered through **mNotify**, a Ghana-based SMS provider. mNotify receives the recipient's phone number and the text of each message in order to deliver it.

Messages sent to a laundry's customers contain the **laundry's name, an order number, and a pickup code**. They do **not** contain the customer's name. Messages sent to laundry administrators relate to their own account, for example subscription reminders.

> [CONFIRM: message wording is still being finalised. Keep this section describing *categories* of information, not exact copy, so it does not go stale.]

## 6. Third parties who process data for us

We rely on a small number of service providers ("sub-processors") to run Rinsion. They may only use data to provide their service to us.

| Provider | What they do | What they can access |
|---|---|---|
| **Supabase** | Database and authentication | Stored data, including login credentials (as a secure hash) |
| **mNotify** (Ghana) | SMS delivery | Recipient phone number and message text for each SMS |
| **Vercel** | Hosting and running the application | Application traffic passing through their servers |
| **Paystack** | Payments | *Not yet active.* When enabled, will process payment amounts and transaction references |

We do not use any analytics, tracking, or advertising services.

## 7. Where data is stored, and international transfers

Our database and authentication are hosted by Supabase on servers located in the **European Union (Ireland)**. This means personal data, including account-holder and laundry-customer data, **is stored outside Ghana**. Our application is hosted by Vercel, which may process traffic through data centres in various locations.

Some personal data is transferred to or stored outside Ghana through our authorised service providers, including Supabase servers in the European Union and infrastructure used by Vercel. We take reasonable steps to ensure such international transfers comply with the Data Protection Act, 2012 (Act 843). Where required by applicable law, we disclose the countries to which personal data may be transferred as part of our obligations under the Act.



## 8. Security and data breaches

We take reasonable steps to protect data, including:
- Passwords are stored only as secure hashes, never in plain text
- Personal data such as names and phone numbers is encrypted where it is stored
- Data is encrypted while travelling between your device and our servers (HTTPS)
- Access to a laundry's data is restricted to that laundry, enforced at the database level
- Deletion of financial and personal records is restricted to controlled internal processes, not open to ordinary account access

No system can be guaranteed completely secure. If we discover that personal data has been accessed or taken by someone without authorisation, we will notify the Data Protection Commission and the affected people as soon as we reasonably can, as required by Act 843.

## 9. How long we keep data, and deletion

Ghana's Data Protection Act, 2012 (Act 843), expects personal data not to be kept longer than necessary for the purpose it was collected. Our approach reflects that.

**Deleting a record in the app is a soft delete:** it is removed from your active dashboard and can be restored, but the underlying record is retained until it is either permanently erased on request or removed under our retention schedule.

**Permanent erasure.** We separate *erasing a person* from *keeping a financial record*:
- When personal data is erased, we remove identifying details (name, phone number, email) from the person's records and from associated message and activity logs.
- Where a record must be kept for financial, tax, or accountability reasons (for example, that an order was placed or a payment was recorded, and which staff member handled it), we keep the record with the personal details removed, so the transaction history stays intact but the individual is no longer identifiable.

**How to request erasure.** If you want your personal data permanently erased, email us at the address below and we will action it, subject to the financial and legal retention limits above. If you are a customer of a laundry, ask the laundry, and they can request erasure through us on your behalf.

**Retention schedule.** Records that are not erased on request are removed under a defined retention schedule for each type of data.

> **Implementation note (remove before publication):** Before launch, Rinsion must research all applicable legal retention obligations (including tax, accounting, commercial, and data protection requirements), decide and document category-specific retention periods, implement those periods operationally, and replace this note with the final published retention schedule.

## 10. Your rights

Under Ghana's Data Protection Act, 2012 (Act 843), you have the right to:
- Be told what personal data we hold about you and get a copy of it
- Ask us to correct inaccurate or incomplete data
- Ask us to permanently erase your data, subject to the retention limits in Section 9
- Give or withdraw your consent to processing, and object to processing in certain cases
- Ask us to stop processing that would cause you unwarranted damage or distress
- Not be subject to a decision based solely on automated processing (we do not currently make such decisions)
- Seek compensation where we have failed to comply with the Act and you have suffered as a result
- Complain to the **Data Protection Commission of Ghana** if you believe we have mishandled your data

To exercise any of these, email **saymmmohamm265@gmail.com**. If you are a customer of a laundry (not an account holder), contact that laundry, since they control your data.

## 11. Children

Rinsion is business software and is not intended for use by anyone under 18. We do not knowingly collect data from children.

## 12. Changes to this policy

We may update this policy as the service changes. If we make a significant change, we will update the "Last updated" date and, where appropriate, notify account holders.

## 13. Contact

Questions or requests: **saymmmohamm265@gmail.com**

---

*This document is a draft prepared to be reviewed and finalised by a qualified lawyer in Ghana. It is not legal advice.*