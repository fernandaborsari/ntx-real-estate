export default function Header() {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-2 h-8 bg-indigo-500 rounded-full" />
        <span className="text-indigo-400 text-sm font-semibold uppercase tracking-widest">
          Portfolio Project
        </span>
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
        North Texas
        <span className="text-indigo-400"> Real Estate</span>
      </h1>
      <p className="mt-3 text-slate-400 text-lg max-w-2xl">
        Home value trends, growth analysis, and investment signals for 18 cities across the DFW metro area.
        <span className="text-slate-500 text-sm ml-2">· Source: Zillow ZHVI · 2000–2026</span>
      </p>
    </header>
  );
}
