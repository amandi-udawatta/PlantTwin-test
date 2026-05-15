import PlantDashboard from "@/components/PlantDashboard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-botanical-bg">
      <header className="border-b border-botanical-border/60 bg-botanical-surface/40 px-6 py-5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-botanical-muted">
              Plant Digital Twin
            </p>
            <h1 className="text-2xl font-semibold text-white">
              Plant<span className="text-botanical-accent">Mind</span>
            </h1>
          </div>
          <span className="rounded-full border border-botanical-border px-3 py-1 text-xs text-botanical-muted">
            Prototype v0.1
          </span>
        </div>
      </header>

      <PlantDashboard />
    </main>
  );
}
