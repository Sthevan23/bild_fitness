# Bild Fitness — ERP SaaS

ERP multi-tenant da **Bild Fitness** (anilhas, halteres, kettlebells) com pedidos, expedição, estoque, NF-e, financeiro, integrações e relatórios.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + Shadcn
- Prisma + **PostgreSQL** (Docker local ou Neon na Vercel)
- NextAuth (credentials) + papéis: ADMIN | FINANCEIRO | EXPEDICAO | ESTOQUE

## Subir local

```powershell
cd "c:\Users\Administrador\Project\Project vendas\pep_vendas"
docker compose up -d
copy .env.example .env
# Ajuste DATABASE_URL no .env para o Docker:
# DATABASE_URL="postgresql://pep:pep123@localhost:5432/pep_vendas?schema=public"
npm install
npm run db:push
npm run db:seed
npm run dev
```

Abra http://localhost:3000

| Usuário | Senha | Papel |
|---------|-------|-------|
| admin@bildfitness.local | admin123 | ADMIN |
| financeiro@bildfitness.local | admin123 | FINANCEIRO |
| expedicao@bildfitness.local | admin123 | EXPEDICAO |
| estoque@bildfitness.local | admin123 | ESTOQUE |

## Deploy na Vercel (demo gratuito)

1. Crie um banco gratis em [neon.tech](https://neon.tech) → copie a **connection string** (com `sslmode=require`).
2. Faça login na Vercel (CLI ou site) e faça o deploy deste projeto.
3. Em **Project → Settings → Environment Variables**, configure:

| Variável | Exemplo |
|----------|---------|
| `DATABASE_URL` | string do Neon |
| `NEXTAUTH_URL` | `https://seu-projeto.vercel.app` |
| `NEXTAUTH_SECRET` | string longa aleatória |
| `TOKEN_ENCRYPTION_KEY` | string longa aleatória |
| `ML_CLIENT_ID` | id do app ML |
| `ML_CLIENT_SECRET` | secret do app ML |
| `ML_REDIRECT_URI` | `https://seu-projeto.vercel.app/api/marketplace/mercadolivre/callback` |
| `CRON_SECRET` | string aleatória |

4. Depois do primeiro deploy, rode o schema + seed apontando para o Neon:

```powershell
$env:DATABASE_URL="postgresql://...neon.../neondb?sslmode=require"
npx prisma db push
npx tsx prisma/seed.ts
```

5. No app do Mercado Livre, atualize o redirect URI para a URL da Vercel.

CLI:

```powershell
npx vercel login
npx vercel --prod
```

## Módulos

Dashboard · Pedidos · Expedição · Estoque · Importar NF-e · Lista de Compras · Financeiro · Clientes · Fornecedores · Relatórios · **Integrações** · Usuários · Configurações

## Mercado Livre (OAuth)

1. Crie um app em https://developers.mercadolivre.com.br
2. Redirect URI com HTTPS (ex. ngrok): `https://SEU_DOMINIO.ngrok-free.dev/api/marketplace/mercadolivre/callback`
3. Preencha no `.env`:

```
ML_CLIENT_ID=seu_app_id
ML_CLIENT_SECRET=seu_secret
ML_REDIRECT_URI=https://SEU_DOMINIO.ngrok-free.dev/api/marketplace/mercadolivre/callback
TOKEN_ENCRYPTION_KEY=chave-forte-aleatoria
CRON_SECRET=segredo-cron
```

4. Abra **Integrações** → **Conectar conta**
5. Sync automática: a cada 5 min na tela, ou cron:

```
GET http://localhost:3000/api/cron/marketplace-sync?secret=SEU_CRON_SECRET
```

Tokens ficam criptografados (AES-256-GCM) e **nunca** vão para o frontend.
