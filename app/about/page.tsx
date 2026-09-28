export default function About() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 font-sans">
      <h1 className="mb-6 text-4xl font-bold tracking-tight">About DocsBot and its team</h1>
      <p className="mb-8 text-lg text-zinc-600">
        DocsBot answers questions about the Python standard library, with a link
        to the section each answer comes from.
      </p>
      <div className="about-note rounded-xl border border-zinc-200 p-6">
        <h2 className="mb-2 text-lg font-semibold">Why we built it</h2>
        <p className="text-zinc-600">
          Searching the docs is slow when you don&apos;t know the right module name.
        </p>
      </div>
    </main>
  );
}
