import { Search, Ticket, QrCode } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const HowItWorks = () => {
  const { t } = useLanguage();
  const steps = [
    { icon: Search, title: t("how.step1"), desc: "Find concerts, sports, festivals and more across Malawi." },
    { icon: Ticket, title: t("how.step2"), desc: "Pay with mobile money or card in under a minute." },
    { icon: QrCode, title: t("how.step3"), desc: "Your unique QR ticket — scan once at the gate." },
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <h2 className="font-display font-extrabold text-3xl md:text-4xl text-center">{t("how.title")}</h2>
      <div className="grid md:grid-cols-3 gap-8 mt-10">
        {steps.map((s, i) => (
          <div key={i} className="text-center p-6 rounded-2xl bg-gradient-card border border-border/50">
            <div className="w-14 h-14 rounded-2xl bg-gradient-hero grid place-items-center mx-auto shadow-glow">
              <s.icon className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="mt-2 text-xs font-bold text-primary">Step {i + 1}</div>
            <h3 className="font-display font-bold text-lg mt-1">{s.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
