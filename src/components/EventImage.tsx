import { useState } from "react";
import { cn } from "@/lib/utils";

interface EventImageProps {
  src: string | null;
  alt: string;
  className?: string;
  aspectClass?: string;
  fallback?: React.ReactNode;
}

export const EventImage = ({
  src,
  alt,
  className,
  aspectClass = "aspect-video",
  fallback,
}: EventImageProps) => {
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return (
      <div className={cn(aspectClass, "bg-muted grid place-items-center overflow-hidden", className)}>
        {fallback}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", aspectClass, className)}>
      <img
        src={src}
        alt=""
        aria-hidden
        className={cn(
          "absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60 transition-opacity duration-300",
          loaded && "opacity-0",
        )}
      />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
};
