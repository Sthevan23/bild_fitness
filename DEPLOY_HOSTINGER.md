# Deploy Hostinger — PEP Vendas (front estático + API Node)

Modelo igual ao **sistema-teste**: dois apps no hPanel a partir do mesmo repositório Git.

## Apps no hPanel

| App | Domínio (exemplo) | Tipo | Artefato |
|-----|-------------------|------|----------|
| Frontend | `sistema.com` | Site Apache | `frontend/out` |
| API | `api.sistema.com` | Node.js App | `backend/dist/index.js` |

## Build

O comando no hPanel é sempre `npm run build`. A variável decide o alvo:

```bash
# App Frontend
SGR_BUILD_TARGET=web

# App API
SGR_BUILD_TARGET=api
```

- `web` → gera `frontend/out` (+ copia `.htaccess` para SPA)
- `api` → gera `backend/dist/index.js`

Start da API (Node App):

```bash
SGR_BUILD_TARGET=api npm start
# ou: node backend/dist/index.js
```

## Variáveis — API

```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=...
DB_PASS=...
DB_NAME=...
# ou DATABASE_URL=mysql://user:pass@localhost:3306/dbname
JWT_SECRET=troque-isto
CORS_ORIGIN=https://sistema.com
COOKIE_SECURE=true
TOKEN_ENCRYPTION_KEY=...
ML_CLIENT_ID=...
ML_CLIENT_SECRET=...
ML_REDIRECT_URI=https://api.sistema.com/marketplace/mercadolivre/callback
CRON_SECRET=...
```

Após o primeiro deploy da API:

```bash
cd backend && npx prisma db push
npm run db:seed
```

## Variáveis — Frontend

```env
NEXT_PUBLIC_API_URL=https://api.sistema.com
```

## Fluxo

1. Usuário abre `https://sistema.com`
2. Front (HTML estático) chama `https://api.sistema.com` com cookies (`credentials: include`)
3. API usa MySQL local (`DB_HOST=localhost`)
4. SSL Let's Encrypt nos dois domínios

## CORS / cookies

- `CORS_ORIGIN` deve ser exatamente a URL do front
- Cookies `bild_token` e `bild_active_account` são `httpOnly` / `sameSite=lax`
- Em produção com HTTPS: `COOKIE_SECURE=true`

## Estrutura do monorepo

```text
frontend/     Next.js output: "export"
backend/      Express + Clean Architecture
packages/shared/  tipos + zod
scripts/build.mjs
.htaccess
```

## Dev local

```bash
npm install
npm run build -w @pep/shared
# MySQL local ou DATABASE_URL
npm run db:push -w backend
npm run db:seed -w backend
npm run dev:api    # :3001
npm run dev:web    # :3000  NEXT_PUBLIC_API_URL=http://localhost:3001
```
