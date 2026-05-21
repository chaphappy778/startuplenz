import VerticalSelector from "@/components/VerticalSelector";
import { softwareApplicationJsonLd } from "@/lib/seo";

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-hero">
        <div className="logo-mark">SL</div>
        <h1 className="hero-title">StartupLenz</h1>
        <p className="hero-sub">
          Live-data cost modeling for new businesses. Pick your vertical, move
          the sliders, see exactly where your money goes.
        </p>
      </div>
      <VerticalSelector />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd()),
        }}
      />
    </main>
  );
}
