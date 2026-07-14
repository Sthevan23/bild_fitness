'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export function XmlDropzone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: false,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'cursor-pointer rounded-2xl border-2 border-dashed border-line bg-panel/70 px-6 py-14 text-center transition',
        isDragActive && 'border-accent bg-accent-soft/50',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <input {...getInputProps()} />
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        {isDragActive ? <UploadCloud className="size-7" /> : <FileUp className="size-7" />}
      </div>
      <p className="text-lg font-medium text-ink">
        {isDragActive ? 'Solte o XML aqui' : 'Arraste o XML da NF-e'}
      </p>
      <p className="mt-2 text-sm text-ink-muted">ou clique para selecionar o arquivo (.xml)</p>
    </div>
  );
}
