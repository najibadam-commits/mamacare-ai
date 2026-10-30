# Safeguarding and user-protection statement (DRAFT)

**Status: draft for the deploying organisation to adopt, adapt and sign.** It describes design choices in the code and the commitments a pilot should make. Aligned in intent with UNICEF's safeguarding and data-protection expectations; it is not a certification.

## 1. Principles

1. **Do no harm.** The app gives education only, never diagnosis or dosing, and sends users to a human provider (112, a saved contact, a facility) whenever a danger sign appears.
2. **Privacy by design and data minimisation.** No accounts, no tracking, data on the user's device, aggregate-only reporting.
3. **Consent and control.** Plain-language consent for reminders; users can export and delete everything at any time.
4. **Inclusion.** English, Hausa and Nigerian Pidgin, offline use, low-bandwidth, text-to-speech.
5. **Accountability.** Named contacts, a reporting route and a review process.

## 2. Risks to women and girls, and how the product responds

| Risk | Response in the product | Still needed from the deployer |
|---|---|---|
| Disclosure of pregnancy to a partner, family or others | Discreet reminders (no title, no pregnancy hint, no icon), encrypted notes, one-tap delete | Tell users the limits; train health workers |
| Coercion or violence | The app collects no relationship data and stores nothing server-side | Provide local referral numbers and a trained responder; consider adding verified GBV referral contacts to the directory |
| Misinformation | Closed corpus, guardrails, refusal of dosing/diagnosis | Clinician sign-off; incident process |
| Delayed emergency care | Triage on-device before any network call | Verify 112 and referral routes locally |
| Exclusion by language, literacy or connectivity | Three languages, audio, offline mode | Native-speaker review; feedback loop |
| Girls under 18 | No profiling, ads or social features; no personal data leaves the device | Age-appropriate content review and a policy for adolescent users (consent norms differ by context) |

## 3. Commitments for any pilot

- Appoint a **safeguarding focal person** and publish their contact (project contact meanwhile: najibadam@gmail.com).
- Do not collect names, phone numbers or identifiers in pilot evaluation unless a separate consent and protocol are approved; use aggregates.
- Brief all staff and volunteers on confidentiality, on not photographing or recording users, and on this statement.
- Report any safeguarding concern or harm to the focal person immediately; record it, protect the person affected, and escalate to the relevant authority and funder as required.
- Never use user data for marketing, profiling or training models without new consent and review.
- Stop or pause the affected feature if clinical or safeguarding harm is suspected.

## 4. Reporting

Concerns about safety, harm, misuse or content: **najibadam@gmail.com** (see also [SECURITY.md](SECURITY.md)). Reports are acknowledged within 48 hours.

## 5. Review

Reviewed before each pilot phase and after any incident. Adopted by: ______________  Role: ________  Date: ________
