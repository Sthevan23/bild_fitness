'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { previewNfeAction, confirmNfeAction } from '@/actions/nfe';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type Preview = Awaited<ReturnType<typeof previewNfeAction>>;

export default function ImportarNfePage() {
  const [preview, setPreview] = useState<Extract<Preview, { ok: true }>['data'] | null>(null);
  const [loading, setLoading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: { 'text/xml': ['.xml'], 'application/xml': ['.xml'] },
    onDrop: async (files) => {
      if (!files[0]) return;
      setLoading(true);
      const fd = new FormData();
      fd.append('file', files[0]);
      const res = await previewNfeAction(fd);
      setLoading(false);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      setPreview(res.data);
    },
  });

  async function confirm() {
    if (!preview) return;
    setLoading(true);
    const res = await confirmNfeAction(preview.previewId);
    setLoading(false);
    if ('error' in res) {
      toast.error(res.error);
      return;
    }
    toast.success('NF-e importada e estoque atualizado');
    setPreview(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Importar NF-e</h1>
        <p className="text-sm text-muted-foreground">Atualiza estoque e custo médio automaticamente</p>
      </div>

      {!preview && (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}`}
        >
          <input {...getInputProps()} />
          <p className="font-medium">{loading ? 'Processando...' : 'Arraste o XML da NF-e ou clique'}</p>
        </div>
      )}

      {preview && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                NF {preview.nota.numero}/{preview.nota.serie} · {preview.nota.fornecedor.razaoSocial}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Chave: <span className="font-mono text-xs">{preview.nota.chaveAcesso}</span></p>
              <p>Total: {formatCurrency(preview.nota.valorTotal)}</p>
              <div className="flex gap-2">
                <Badge variant="success">{preview.summary.itensExistentes} existentes</Badge>
                <Badge>{preview.summary.itensNovos} novos</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="overflow-x-auto pt-5">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">SKU</th>
                    <th className="py-2">Descrição</th>
                    <th className="py-2">Qtd</th>
                    <th className="py-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.itens.map((i) => (
                    <tr key={i.numeroItem} className="border-b">
                      <td className="py-2 font-mono text-xs">{i.codigo}</td>
                      <td className="py-2">{i.descricao}</td>
                      <td className="py-2">{i.quantidade}</td>
                      <td className="py-2"><Badge variant={i.action === 'create' ? 'secondary' : 'success'}>{i.action}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button onClick={confirm} disabled={loading}>Confirmar importação</Button>
            <Button variant="secondary" onClick={() => setPreview(null)}>Cancelar</Button>
          </div>
        </>
      )}
    </div>
  );
}
