import { NextRequest, NextResponse } from 'next/server';
import { MercadoLivreSyncService } from '@/modules/marketplace/mercadolivre';

/** Cron externo: GET /api/cron/marketplace-sync?secret=CRON_SECRET a cada 5 min */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await MercadoLivreSyncService.syncAllConnected();
  return NextResponse.json({
    ok: true,
    syncedAt: new Date().toISOString(),
    results,
  });
}
