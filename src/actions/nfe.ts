'use server';

import { requireModule } from '@/lib/session';
import { AppError } from '@/lib/errors';
import * as nfeImportService from '@/services/nfe/nfe-import.service';
import { revalidatePath } from 'next/cache';

export async function previewNfeAction(formData: FormData) {
  try {
    const session = await requireModule('nfe');
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { error: 'Arquivo XML obrigatório' };
    }
    const xmlContent = await file.text();
    const data = await nfeImportService.previewNfeImport({
      userId: session.user.id,
      companyId: session.user.companyId,
      xmlContent,
    });
    return { ok: true as const, data };
  } catch (e) {
    const message = e instanceof AppError ? e.message : e instanceof Error ? e.message : 'Erro ao processar XML';
    return { error: message };
  }
}

export async function confirmNfeAction(previewId: string) {
  try {
    const session = await requireModule('nfe');
    const result = await nfeImportService.confirmNfeImport({
      userId: session.user.id,
      companyId: session.user.companyId,
      previewId,
    });
    revalidatePath('/estoque');
    revalidatePath('/importar-nfe');
    return { ok: true as const, data: result };
  } catch (e) {
    const message = e instanceof AppError ? e.message : e instanceof Error ? e.message : 'Erro ao confirmar';
    return { error: message };
  }
}

export async function cancelNfeAction(previewId: string) {
  try {
    const session = await requireModule('nfe');
    nfeImportService.cancelNfePreview(previewId, session.user.id);
    return { ok: true as const };
  } catch (e) {
    const message = e instanceof AppError ? e.message : e instanceof Error ? e.message : 'Erro ao cancelar';
    return { error: message };
  }
}
