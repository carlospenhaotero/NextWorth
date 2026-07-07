import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <Link
        href="/"
        className="mb-6 rounded-lg outline-none transition-transform focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
      >
        <span className="text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-display)]">
          NextWorth
        </span>
      </Link>
      <div className="glass-card w-full max-w-md !p-8">{children}</div>
    </div>
  );
}
