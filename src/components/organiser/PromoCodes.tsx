import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PromoCode {
  code: string;
  type: "percent" | "fixed";
  value: number;
}

const STORAGE_KEY = "tikitimw_promo_codes";

export const PromoCodes = ({ vendorId }: { vendorId: string }) => {
  const key = `${STORAGE_KEY}_${vendorId}`;
  const [codes, setCodes] = useState<PromoCode[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "[]") as PromoCode[];
    } catch {
      return [];
    }
  });
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");

  const save = (list: PromoCode[]) => {
    setCodes(list);
    localStorage.setItem(key, JSON.stringify(list));
  };

  const add = () => {
    if (!code.trim() || !value) return toast.error("Enter code and value");
    const v = Number(value);
    if (type === "percent" && (v <= 0 || v > 100)) return toast.error("Percent must be 1–100");
    save([...codes, { code: code.toUpperCase(), type, value: v }]);
    setCode("");
    setValue("");
    toast.success("Promo code created");
  };

  return (
    <div className="rounded-2xl border border-border p-6 bg-gradient-card">
      <h3 className="font-display font-bold text-xl mb-4">Promo codes</h3>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div>
          <Label>Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SUMMER20" className="h-12 mt-1" />
        </div>
        <div>
          <Label>Type</Label>
          <select
            className="mt-1 w-full h-12 rounded-md border border-input bg-background px-3"
            value={type}
            onChange={(e) => setType(e.target.value as "percent" | "fixed")}
          >
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed MWK off</option>
          </select>
        </div>
        <div>
          <Label>Value</Label>
          <Input value={value} onChange={(e) => setValue(e.target.value)} type="number" className="h-12 mt-1" />
        </div>
      </div>
      <Button onClick={add} className="min-h-12">
        Create code
      </Button>
      {codes.length > 0 && (
        <ul className="mt-6 space-y-2">
          {codes.map((c) => (
            <li key={c.code} className="flex justify-between items-center text-sm border border-border rounded-lg px-4 py-3 min-h-12">
              <span className="font-mono font-bold">{c.code}</span>
              <span className="text-muted-foreground">
                {c.type === "percent" ? `${c.value}% off` : `MK ${c.value} off`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
