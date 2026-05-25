import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

const faqs = [
  {
    q: "Is my payment secure?",
    a: "Yes. Payments are processed through licensed mobile money and card providers. TikitiMW never stores your PIN or card CVV.",
  },
  {
    q: "What if the event is cancelled?",
    a: "If an organiser cancels, paid ticket holders are notified by email/SMS and refunds are processed according to the event's policy.",
  },
  {
    q: "How do I get my ticket?",
    a: "After payment you'll see your QR ticket in My Tickets and receive a copy by email. Show the QR code at the gate.",
  },
  {
    q: "Which payment methods are accepted?",
    a: "Airtel Money, TNM Mpamba, Visa/Mastercard, and bank transfer are supported at checkout.",
  },
];

export const FAQ = () => {
  const { t } = useLanguage();
  return (
    <section className="container mx-auto px-4 py-16 max-w-2xl">
      <h2 className="font-display font-extrabold text-3xl text-center mb-8">{t("faq.title")}</h2>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
