import { Router } from 'express';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';
import { isAppError } from '../../../shared/errors.js';
import { ImportControleVendasUseCase } from '../application/import-planilha.usecase.js';
import { ImportMlVendasUseCase } from '../application/import-ml-vendas.usecase.js';

export const spreadsheetImportRouter = Router();
const importControle = new ImportControleVendasUseCase();
const importMl = new ImportMlVendasUseCase();

spreadsheetImportRouter.use(authMiddleware);

/** Export diário Mercado Livre — aba “Vendas BR”. Estoque na conta ativa. */
spreadsheetImportRouter.post('/mercadolivre-vendas', async (req: AuthedRequest, res) => {
  try {
    const { fileBase64, fileName, filePath } = req.body || {};
    const activeCode = req.cookies?.bild_active_account;

    let result;
    if (filePath && typeof filePath === 'string') {
      result = await importMl.executeFromPath(
        req.user!.companyId,
        filePath,
        activeCode,
        fileName,
        req.user!.id,
      );
    } else if (fileBase64 && typeof fileBase64 === 'string') {
      const b64 = String(fileBase64).replace(/^data:.*;base64,/, '');
      const buffer = Buffer.from(b64, 'base64');
      result = await importMl.executeFromBuffer(
        req.user!.companyId,
        buffer,
        fileName || 'vendas-br-ml.xlsx',
        activeCode,
        req.user!.id,
      );
    } else {
      res.status(400).json({ error: 'Envie fileBase64 ou filePath' });
      return;
    }

    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro na importação ML' });
  }
});

/** Importa planilha Controle de Vendas (legado / compatibilidade). */
spreadsheetImportRouter.post('/controle-vendas', async (req: AuthedRequest, res) => {
  try {
    const { fileBase64, fileName, filePath } = req.body || {};

    let result;
    if (filePath && typeof filePath === 'string') {
      result = await importControle.executeFromPath(req.user!.companyId, filePath, fileName);
    } else if (fileBase64 && typeof fileBase64 === 'string') {
      const b64 = String(fileBase64).replace(/^data:.*;base64,/, '');
      const buffer = Buffer.from(b64, 'base64');
      result = await importControle.executeFromBuffer(
        req.user!.companyId,
        buffer,
        fileName || 'controle-vendas.xlsx',
      );
    } else {
      res.status(400).json({ error: 'Envie fileBase64 ou filePath' });
      return;
    }

    res.json(result);
  } catch (e) {
    const status = isAppError(e) ? e.statusCode : 500;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erro na importação' });
  }
});
