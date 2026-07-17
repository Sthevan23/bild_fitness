import { Router } from 'express';
import { authMiddleware, type AuthedRequest } from '../../../shared/auth.js';
import { isAppError } from '../../../shared/errors.js';
import { ImportControleVendasUseCase } from '../application/import-planilha.usecase.js';

export const spreadsheetImportRouter = Router();
const importUseCase = new ImportControleVendasUseCase();

spreadsheetImportRouter.use(authMiddleware);

/** Importa planilha Controle de Vendas (base64 do .xlsx). Só ML / histórico. */
spreadsheetImportRouter.post('/controle-vendas', async (req: AuthedRequest, res) => {
  try {
    const { fileBase64, fileName, filePath } = req.body || {};

    let result;
    if (filePath && typeof filePath === 'string') {
      result = await importUseCase.executeFromPath(req.user!.companyId, filePath, fileName);
    } else if (fileBase64 && typeof fileBase64 === 'string') {
      const b64 = String(fileBase64).replace(/^data:.*;base64,/, '');
      const buffer = Buffer.from(b64, 'base64');
      result = await importUseCase.executeFromBuffer(
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
