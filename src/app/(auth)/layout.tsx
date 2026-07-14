export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50 to-slate-200 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
