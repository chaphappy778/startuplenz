import VerticalSelector from "@/components/VerticalSelector";

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-hero">
        <div className="logo-mark">SL</div>
        <h1 className="hero-title">
          StartupLenz
        </h1>
        <p className="hero-sub">
          Live-data cost modeling for entrepreneurs. Pick your vertical, move
          the sliders, see exactly where your money goes.
        </p>
      </div>
      <VerticalSelector />
    </main>
  );
}
