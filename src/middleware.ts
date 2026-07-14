export { withAuth as middleware } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pedidos/:path*',
    '/expedicao/:path*',
    '/estoque/:path*',
    '/importar-nfe/:path*',
    '/lista-compras/:path*',
    '/financeiro/:path*',
    '/fornecedores/:path*',
    '/clientes/:path*',
    '/relatorios/:path*',
    '/integracoes/:path*',
    '/usuarios/:path*',
    '/configuracoes/:path*',
  ],
};
