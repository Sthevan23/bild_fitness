import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook do Mercado Livre (notificações).
 * Por enquanto só confirma recebimento; a sync completa continua via
 * "Sincronizar agora" / cron. Evolução futura: disparar sync por topic.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    console.log('[ML webhook]', JSON.stringify(body));
  } catch {
    // ignore parse errors — ML só precisa de 200
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'mercadolivre-notifications' });
}
