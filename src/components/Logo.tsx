import logoAsset from "@/assets/tikitimw-logo.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  alt?: string;
}

export const Logo = ({ className, alt = "TikitiMW logo" }: LogoProps) => (
  <img
    src={logoAsset.url}
    alt={alt}
    className={cn("object-contain", className)}
    loading="eager"
    decoding="async"
  />
);
