import { Router } from 'express';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';
import { isAppError } from '../../../shared/errors.js';
import { ImportControleVendasUseCase } from '../application/import-planilha.usecase.js';
import { ImportMlVendasUseCase } from '../application/import-ml-vendas.usecase.js';

export const spreadsheetImportRouter = Router();
const importControle = new ImportControleVendasUseCase();
const importMl = new ImportMlVendasUseCase();

spreadsheetImportRouter.use(authMiddleware);

function readBase64File(req: AuthedRequest) {
  const { fileBase64, fileName } = req.body || {};
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    return null;
  }
  const b64 = String(fileBase64).replace(/^data:.*;base64,/, '');
  return {
    buffer: Buffer.from(b64, 'base64'),
    fileName: typeof fileName === 'string' && fileName ? fileName : 'upload.xlsx',
  };
}

/** Export diário Mercado Livre — aba “Vendas BR”. Estoque na conta ativa. */
spreadsheetImportRouter.post('/mercadolivre-vendas', async (req: AuthedRequest, res) => {
  try {
    const file = readBase64File(req);
    if (!file) {
      res.status(400).json({ error: 'Envie fileBase64 (arquivo Excel)' });
      return;
    }
    const result = await importMl.executeFromBuffer(
      req.user!.companyId,
      file.buffer,
      file.fileName,
      req.cookies?.bild_active_account,
      req.user!.id,
    );
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro na importação ML' });
  }
});

/** Importa planilha Controle de Vendas (legado / compatibilidade). */
spreadsheetImportRouter.post('/controle-vendas', async (req: AuthedRequest, res) => {
  try {
    const file = readBase64File(req);
    if (!file) {
      res.status(400).json({ error: 'Envie fileBase64 (arquivo Excel)' });
      return;
    }
    const result = await importControle.executeFromBuffer(
      req.user!.companyId,
      file.buffer,
      file.fileName,
    );
    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro na importação' });
  }
});
