import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PageShell } from "@/components/PageShell";
import { ArrowLeft } from "lucide-react";

interface LegalLayoutProps {
  title: string;
  description: string;
  lastUpdated: string;
  children: ReactNode;
}

export const LegalLayout = ({ title, description, lastUpdated, children }: LegalLayoutProps) => (
  <PageShell>
    <Helmet>
      <title>{title} — TikitiMW</title>
      <meta name="description" content={description} />
    </Helmet>
    <article className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>
      <header className="mb-10">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-3">Last updated: {lastUpdated}</p>
      </header>
      <div className="legal-prose space-y-8 text-[15px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </article>
  </PageShell>
);

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h2 className="font-display font-bold text-xl mb-3">{title}</h2>
    <div className="space-y-3 text-muted-foreground">{children}</div>
  </section>
);
