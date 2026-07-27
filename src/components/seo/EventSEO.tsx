import { Helmet } from "react-helmet-async";
import { formatDateTimeShort } from "@/lib/format";

interface EventSEOProps {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  venue: string;
  city: string;
  bannerUrl?: string | null;
  minPrice?: number;
  remaining?: number;
}

export const EventSEO = ({
  id,
  title,
  description,
  startsAt,
  venue,
  city,
  bannerUrl,
  minPrice,
  remaining,
}: EventSEOProps) => {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/events/${id}`;
  const image = bannerUrl ?? `${typeof window !== "undefined" ? window.location.origin : ""}/favicon.ico`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: title,
    startDate: startsAt,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: venue,
      address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "MW" },
    },
    image: [image],
    description: description ?? `Book tickets for ${title} on Tikiti Malawi`,
    offers:
      minPrice !== undefined
        ? {
            "@type": "Offer",
            price: minPrice,
            priceCurrency: "MWK",
            availability:
              remaining === 0
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
            url,
          }
        : undefined,
  };

  return (
    <Helmet>
      <title>{title} — Tikiti Malawi</title>
      <meta name="description" content={description ?? `Book tickets for ${title}`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={`${formatDateTimeShort(startsAt)} · ${venue}, ${city}`} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};
