import { Link } from "react-router-dom";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

const PrivacyPolicy = () => (
  <LegalLayout
    title="Privacy Policy"
    description="How TikitiMW collects, uses, and protects your personal information."
    lastUpdated="27 July 2026"
  >
    <p>
      TikitiMW (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates an event ticketing platform for Malawi.
      This Privacy Policy explains how we collect, use, store, and share information when you use our website,
      mobile experience, and related services (collectively, the &quot;Service&quot;).
    </p>
    <p>
      By creating an account, purchasing tickets, or otherwise using TikitiMW, you agree to the practices
      described in this policy. If you do not agree, please do not use the Service.
    </p>

    <LegalSection title="1. Information we collect">
      <p><strong>Account information:</strong> name, email address, phone number, and password when you register.</p>
      <p><strong>Ticket and order data:</strong> events you view or purchase, ticket quantities, payment method selected, order totals, and QR ticket identifiers.</p>
      <p><strong>Payment information:</strong> payments are processed by PayChangu. We do not store your full mobile money PIN, card number, or bank credentials. We may receive transaction references, payment status, and limited billing details from our payment partner.</p>
      <p><strong>Organiser information:</strong> if you apply to sell tickets, we collect your account details and application status.</p>
      <p><strong>Check-in data:</strong> when your ticket is scanned at an event, we record scan time, scan result, and the staff member who performed the scan.</p>
      <p><strong>Technical data:</strong> device type, browser, IP address, pages visited, and cookies or local storage used to keep you signed in and remember preferences.</p>
    </LegalSection>

    <LegalSection title="2. How we use your information">
      <p>To create and manage your account and authenticate you securely.</p>
      <p>To process ticket orders, deliver QR tickets, and send purchase confirmations by email when configured.</p>
      <p>To facilitate event entry through QR code scanning.</p>
      <p>To provide customer support and respond to enquiries.</p>
      <p>To detect fraud, abuse, and unauthorized transactions.</p>
      <p>To improve the Service, fix bugs, and understand usage patterns in aggregate.</p>
      <p>To comply with legal obligations and enforce our <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.</p>
    </LegalSection>

    <LegalSection title="3. How we share information">
      <p><strong>Event organisers:</strong> when you buy a ticket, the organiser receives information needed to run the event (such as your name, contact details, and ticket status).</p>
      <p><strong>Service providers:</strong> we use Supabase (hosting and database), PayChangu (payments), and optionally Resend (email). These providers process data on our behalf under contractual safeguards.</p>
      <p><strong>Legal requirements:</strong> we may disclose information if required by law, court order, or to protect the rights, safety, and security of TikitiMW, our users, or the public.</p>
      <p>We do not sell your personal information to third-party advertisers.</p>
    </LegalSection>

    <LegalSection title="4. Data retention">
      <p>
        We retain account and order records for as long as your account is active and as needed to provide the Service,
        resolve disputes, enforce agreements, and meet legal or accounting requirements. Ticket and payment records
        related to completed sales may be kept for audit purposes even after an event ends.
      </p>
    </LegalSection>

    <LegalSection title="5. Security">
      <p>
        We use industry-standard measures including encrypted connections (HTTPS), access controls, and database
        row-level security. No method of transmission or storage is completely secure; you are responsible for
        keeping your password confidential.
      </p>
    </LegalSection>

    <LegalSection title="6. Your rights and choices">
      <p>You may update your profile information from your account settings.</p>
      <p>You may request access to, correction of, or deletion of your personal data by contacting us, subject to legal and operational limits (for example, we may need to retain order records).</p>
      <p>You may sign out at any time. Clearing browser storage will remove locally saved offline tickets.</p>
      <p>
        If you receive marketing emails from us in the future, you will be able to unsubscribe using the link
        in those messages.
      </p>
    </LegalSection>

    <LegalSection title="7. Cookies and local storage">
      <p>
        We use essential cookies and browser local storage to maintain your session, remember UI preferences,
        and store tickets offline for gate entry when connectivity is limited. These are necessary for core
        functionality and are not used for third-party advertising.
      </p>
    </LegalSection>

    <LegalSection title="8. Children">
      <p>
        TikitiMW is not directed at children under 13. We do not knowingly collect personal information from
        children. If you believe a child has provided us data, please contact us so we can delete it.
      </p>
    </LegalSection>

    <LegalSection title="9. International processing">
      <p>
        Your data may be processed on servers located outside Malawi through our cloud providers. We take
        steps to ensure appropriate safeguards are in place when data is transferred internationally.
      </p>
    </LegalSection>

    <LegalSection title="10. Changes to this policy">
      <p>
        We may update this Privacy Policy from time to time. We will post the revised version on this page
        and update the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance.
      </p>
    </LegalSection>

    <LegalSection title="11. Contact us">
      <p>
        For privacy questions or data requests, contact TikitiMW at{" "}
        <a href="mailto:privacy@tikitimw.com" className="text-primary hover:underline">privacy@tikitimw.com</a>.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default PrivacyPolicy;
