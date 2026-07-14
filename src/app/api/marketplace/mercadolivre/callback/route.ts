import { NextRequest, NextResponse } from 'next/server';
import { MercadoLivreAuthService } from '@/modules/marketplace/mercadolivre';
import { consumeMercadoLivreOAuthState } from '@/actions/marketplace';

export async function GET(req: NextRequest) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/integracoes?error=${encodeURIComponent('Autorização cancelada no Mercado Livre')}`, base),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/integracoes?error=${encodeURIComponent('Código OAuth inválido')}`, base),
    );
  }

  const companyId = await consumeMercadoLivreOAuthState(state);
  if (!companyId) {
    return NextResponse.redirect(
      new URL(`/integracoes?error=${encodeURIComponent('Sessão OAuth expirada. Tente novamente.')}`, base),
    );
  }

  try {
    const tokens = await MercadoLivreAuthService.exchangeCode(code);
    const user = await MercadoLivreAuthService.getUser(tokens.access_token);
    await MercadoLivreAuthService.saveConnection({
      companyId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      sellerId: String(user.id),
      nickname: user.nickname,
      accountName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.nickname,
      scope: tokens.scope,
    });

    // Sync inicial em background (não bloqueia o redirect por muito tempo)
    const { MercadoLivreSyncService } = await import('@/modules/marketplace/mercadolivre');
    void MercadoLivreSyncService.syncCompany(companyId).catch(() => undefined);

    return NextResponse.redirect(new URL('/integracoes?connected=1', base));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao conectar Mercado Livre';
    return NextResponse.redirect(new URL(`/integracoes?error=${encodeURIComponent(message)}`, base));
  }
}
