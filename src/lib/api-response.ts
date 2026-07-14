import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: err.message, details: err.details },
      { status: err.statusCode },
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: err.flatten() },
      { status: 400 },
    );
  }

  console.error(err);
  return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
}
