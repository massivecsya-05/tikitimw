import { Smartphone, CreditCard, Building2 } from "lucide-react";

const methods = [
  { name: "Airtel Money", color: "text-red-600", icon: Smartphone },
  { name: "TNM Mpamba", color: "text-yellow-600", icon: Smartphone },
  { name: "Visa / Mastercard", color: "text-blue-600", icon: CreditCard },
  { name: "Bank Transfer", color: "text-slate-600", icon: Building2 },
];

export const PaymentMethodsBar = () => (
  <section className="border-y border-border/60 bg-muted/30 py-8">
    <div className="container mx-auto px-4">
      <p className="text-center text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-5">
        Pay securely with
      </p>
      <div className="flex flex-wrap justify-center gap-6 md:gap-10">
        {methods.map((m) => (
          <div key={m.name} className="flex items-center gap-2 text-sm font-semibold">
            <m.icon className={`w-5 h-5 ${m.color}`} />
            <span>{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);
