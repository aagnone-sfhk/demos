import { useEffect, useState } from "react";

type Demo = {
  slug: string;
  title: string;
  blurb: string;
  url: string | null;
  source?: string;
  tags?: string[];
};

export default function App() {
  const [demos, setDemos] = useState<Demo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/demos.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Demo[]>;
      })
      .then(setDemos)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main className="page">
      <header className="hero">
        <h1>Anthony's Demos</h1>
        <p>A running index of the demos I've built. Click any card to open the live app.</p>
      </header>

      {error && <div className="error">Failed to load demos: {error}</div>}
      {!demos && !error && <div className="loading">Loading…</div>}

      {demos && (
        <section className="grid">
          {demos.map((d) => (
            <DemoCard key={d.slug} demo={d} />
          ))}
        </section>
      )}
    </main>
  );
}

function DemoCard({ demo }: { demo: Demo }) {
  const live = Boolean(demo.url);
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    live ? (
      <a className="card" href={demo.url ?? "#"} target="_blank" rel="noreferrer">
        {children}
      </a>
    ) : (
      <div className="card card--stub">{children}</div>
    );

  return (
    <Wrapper>
      <div className="card__head">
        <h2 className="card__title">{demo.title}</h2>
        {!live && <span className="chip">Coming soon</span>}
      </div>
      <p className="card__blurb">{demo.blurb}</p>
      <footer className="card__foot">
        {demo.tags?.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
        {demo.source && (
          <a
            className="src"
            href={demo.source}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Source ↗
          </a>
        )}
      </footer>
    </Wrapper>
  );
}
