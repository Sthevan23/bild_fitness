import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startMercadoLivreConnect } from '@/actions/marketplace';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
  }

  const result = await startMercadoLivreConnect();
  if ('error' in result && result.error) {
    return NextResponse.redirect(
      new URL(`/integracoes?error=${encodeURIComponent(result.error)}`, process.env.NEXTAUTH_URL || 'http://localhost:3000'),
    );
  }
  return NextResponse.redirect(result.url!);
}
