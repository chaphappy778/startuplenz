// apps/web/components/VerticalExplainer.tsx
//
// Long-form copy shown below the calculator on /model/[vertical].
// This is the SEO meat — Google indexes this content, and the calculator
// above is the engagement payoff.

import { faqPageJsonLd } from "@/lib/seo";
import type { VerticalContent } from "@/lib/verticalContent";

interface Props {
  displayName: string;
  content: VerticalContent;
}

export default function VerticalExplainer({ displayName, content }: Props) {
  return (
    <section className="vertical-explainer">
      <h2 className="vertical-explainer-title">
        What goes into {displayName} costs
      </h2>
      <div className="vertical-explainer-body">
        {content.explainer.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {content.faqs.length > 0 && (
        <>
          <h2 className="vertical-explainer-title vertical-faq-title">
            Frequently asked
          </h2>
          <div className="vertical-faq-list">
            {content.faqs.map((f, i) => (
              <details key={i} className="vertical-faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          {/* FAQPage structured-data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(faqPageJsonLd(content.faqs)),
            }}
          />
        </>
      )}
    </section>
  );
}
