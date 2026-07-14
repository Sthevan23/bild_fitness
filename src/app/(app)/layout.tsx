import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 hidden border-b bg-card/90 px-6 py-3 backdrop-blur lg:block">
          <Breadcrumb />
        </header>
        <main className="flex-1 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
