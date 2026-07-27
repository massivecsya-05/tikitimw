import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bell } from "lucide-react";

export const SubscribeEmpty = () => {
  const { t } = useLanguage();
  const [contact, setContact] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return toast.error("Enter your email or phone number");
    const key = "tikitimw_subscribers";
    const list = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
    list.push(contact.trim());
    localStorage.setItem(key, JSON.stringify(list));
    toast.success("You're on the list! We'll notify you when events go live.");
    setContact("");
  };

  return (
    <div className="text-center py-16 px-6 bg-gradient-card rounded-3xl border border-dashed border-border max-w-xl mx-auto">
      <Bell className="w-12 h-12 mx-auto text-primary mb-4" />
      <h3 className="font-display font-bold text-2xl">{t("hero.stayTuned")}</h3>
      <p className="text-muted-foreground mt-2 text-sm">Leave your email or SMS number and we'll let you know first.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <Input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Email or +265…"
          className="h-12 flex-1"
          inputMode="email"
        />
        <Button type="submit" variant="hero" className="min-h-12 shrink-0">
          {t("hero.subscribe")}
        </Button>
      </form>
    </div>
  );
};
