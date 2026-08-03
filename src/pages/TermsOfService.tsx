import { Link } from "react-router-dom";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

const TermsOfService = () => (
  <LegalLayout
    title="Terms of Service"
    description="Terms and conditions for using TikitiMW to buy and sell event tickets in Malawi."
    lastUpdated="27 July 2026"
  >
    <p>
      These Terms of Service (&quot;Terms&quot;) govern your access to and use of TikitiMW, an event ticketing
      platform operated for users in Malawi and beyond. Please read them carefully before using the Service.
    </p>
    <p>
      By accessing TikitiMW, creating an account, purchasing tickets, or listing events, you agree to these
      Terms and our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
    </p>

    <LegalSection title="1. About TikitiMW">
      <p>
        TikitiMW connects event organisers (&quot;Organisers&quot;) with ticket buyers (&quot;Customers&quot;). We provide
        the technology to list events, sell tickets, process payments through PayChangu, issue QR tickets,
        and check in attendees. TikitiMW is a platform â€” unless stated otherwise, we are not the organiser
        of events listed by third parties.
      </p>
    </LegalSection>

    <LegalSection title="2. Eligibility">
      <p>You must be at least 18 years old, or have permission from a parent or guardian, to use the Service.</p>
      <p>You must provide accurate registration information and keep your account credentials secure.</p>
      <p>Organisers must complete our vendor application and be approved before publishing paid events.</p>
    </LegalSection>

    <LegalSection title="3. Accounts">
      <p>You are responsible for all activity under your account.</p>
      <p>We may suspend or terminate accounts that violate these Terms, engage in fraud, or harm other users.</p>
      <p>Admin and organiser roles are granted at our discretion and may be revoked for misuse.</p>
    </LegalSection>

    <LegalSection title="4. Buying tickets">
      <p>
        Ticket prices, availability, and event details are set by Organisers. We display this information
        in good faith but do not guarantee accuracy â€” contact the Organiser if details change.
      </p>
      <p>
        A ticket order is confirmed only after successful payment. Pending orders may expire if payment
        is not completed.
      </p>
      <p>
        QR tickets are personal and may be checked against the purchaser&apos;s name or phone at the gate.
        Do not share ticket screenshots publicly â€” duplicated use may be refused.
      </p>
      <p>
        Each ticket is valid for one entry unless the Organiser states otherwise. Lost or deleted tickets
        may be recovered from <Link to="/my-tickets" className="text-primary hover:underline">My Tickets</Link> while signed in.
      </p>
    </LegalSection>

    <LegalSection title="5. Payments">
      <p>
        Payments are processed by PayChangu using Airtel Money, TNM Mpamba, card, or bank transfer as
        available. By paying, you also agree to PayChangu&apos;s applicable terms.
      </p>
      <p>
        All prices are shown in Malawian Kwacha (MWK) unless otherwise stated. Service or platform fees,
        if any, will be shown before checkout.
      </p>
      <p>
        Failed, cancelled, or reversed payments do not entitle you to tickets. Successful payment triggers
        ticket issuance.
      </p>
    </LegalSection>

    <LegalSection title="6. Refunds and cancellations">
      <p>
        Refund policies are set by the Organiser unless required by law. TikitiMW does not automatically
        issue refunds for cancelled events â€” Organisers are responsible for communicating cancellation terms
        and arranging refunds where applicable.
      </p>
      <p>
        If an event is cancelled, Organisers should notify ticket holders promptly. Mobile money refunds
        may need to be processed manually by the Organiser, as automated reversal is not always available
        through payment providers.
      </p>
      <p>
        Contact the Organiser first for event-specific refund requests. For platform issues (duplicate
        charges, missing tickets after confirmed payment), email{" "}
        <a href="mailto:support.tikitimw@gmail.com" className="text-primary hover:underline">support.tikitimw@gmail.com</a>.
      </p>
    </LegalSection>

    <LegalSection title="7. Payouts and platform fees">
      <p>
        TikitiMW deducts a platform fee (a percentage plus a flat amount per ticket, shown in your
        Organiser dashboard) from each paid order before calculating your payout.
      </p>
      <p>
        Organisers may request withdrawal of their available balance at any time from the Organiser
        dashboard. Requests are reviewed and processed manually by TikitiMW to your chosen mobile money
        or bank account \u2014 you are responsible for ensuring the account details you provide are accurate.
        TikitiMW is not liable for funds sent to an incorrect account you supplied.
      </p>
      <p>
        Payout timing is not guaranteed and may take longer during payment provider delays or additional
        verification.
      </p>
    </LegalSection>

    <LegalSection title="8. Organiser responsibilities">
      <p>Organisers must provide accurate event information, honour valid tickets, and comply with applicable laws.</p>
      <p>Organisers must not list fraudulent, illegal, or misleading events.</p>
      <p>Organisers are responsible for venue capacity, safety, and attendee experience at their events.</p>
      <p>Organisers must handle customer enquiries and refund requests related to their events.</p>
      <p>TikitiMW may remove events, withhold payouts, or suspend Organisers who breach these Terms.</p>
    </LegalSection>

    <LegalSection title="9. Prohibited conduct">
      <p>Reselling tickets in violation of Organiser rules or applicable law.</p>
      <p>Using bots, scrapers, or automated tools to purchase tickets in bulk.</p>
      <p>Attempting to bypass payment, forge QR codes, or reuse scanned tickets.</p>
      <p>Uploading offensive, infringing, or illegal content in event listings or banners.</p>
      <p>Interfering with the security or operation of the Service.</p>
    </LegalSection>

    <LegalSection title="10. Intellectual property">
      <p>
        TikitiMW branding, software, and design are owned by us or our licensors. You may not copy or
        reverse-engineer the platform without permission.
      </p>
      <p>
        Organisers retain rights to their event content but grant TikitiMW a licence to display listings,
        banners, and promotional material on the Service.
      </p>
    </LegalSection>

    <LegalSection title="11. Disclaimers">
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;. WE DO NOT WARRANT UNINTERRUPTED ACCESS,
        ERROR-FREE OPERATION, OR THAT EVENTS WILL OCCUR AS ADVERTISED.
      </p>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY LAW, TIKITIMW IS NOT LIABLE FOR ACTS OR OMISSIONS OF ORGANISERS,
        VENUES, OR PAYMENT PROVIDERS.
      </p>
    </LegalSection>

    <LegalSection title="12. Limitation of liability">
      <p>
        To the maximum extent permitted by applicable law, TikitiMW&apos;s total liability for any claim arising
        from your use of the Service is limited to the amount you paid to TikitiMW for the relevant ticket
        order in the twelve (12) months before the claim, or MWK 50,000, whichever is greater.
      </p>
      <p>
        We are not liable for indirect, incidental, special, or consequential damages, including lost profits
        or missed events.
      </p>
    </LegalSection>

    <LegalSection title="13. Dispute resolution">
      <p>
        These Terms are governed by the laws of the Republic of Malawi. Parties agree to attempt good-faith
        resolution before pursuing formal remedies. Courts in Malawi shall have jurisdiction unless otherwise
        required by mandatory consumer protection law.
      </p>
    </LegalSection>

    <LegalSection title="14. Changes">
      <p>
        We may modify these Terms at any time. Material changes will be posted on this page. Continued use
        after changes constitutes acceptance. If you disagree, stop using the Service and contact us regarding
        outstanding ticket issues.
      </p>
    </LegalSection>

    <LegalSection title="15. Contact">
      <p>
        Questions about these Terms:{" "}
        <a href="mailto:legal@tikitimw.com" className="text-primary hover:underline">legal@tikitimw.com</a>
      </p>
      <p>General support:{" "}
        <a href="mailto:support.tikitimw@gmail.com" className="text-primary hover:underline">support.tikitimw@gmail.com</a>
      </p>
    </LegalSection>
  </LegalLayout>
);

export default TermsOfService;



