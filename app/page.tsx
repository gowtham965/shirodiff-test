const features = [
  { title: "Fast search", body: "Find answers across the Python docs in seconds." },
  { title: "Cited answers", body: "Every answer links back to the source section." },
  { title: "Open source", body: "Built in public, easy to self-host." },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 font-sans">
      <nav className="mb-16 flex items-center justify-between">
        <span className="text-xl font-bold">DocsBot</span>
        <div className="flex gap-6 text-sm">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <section className="mb-20 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Ask the Python docs anything
        </h1>
        <p className="mb-8 text-lg text-zinc-600">
          A tiny demo page used to try out visual diffs on pull requests.
        </p>
        <button className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white">
          Get started
        </button>
      </section>

      <section id="features" className="grid gap-6">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-zinc-200 p-6">
            <h2 className="mb-2 text-lg font-semibold">{f.title}</h2>
            <p className="text-zinc-600">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
