# Análise: PLANILHA - CONTROLE DE VENDAS - V2

**Contexto:** planilha que o cliente usa hoje como centro do gerenciamento de vendas (Mercado Livre), estoque por conta, financeiro e compras. Objetivo: importar/replicar essa lógica dentro do ERP (front + API + banco), alinhado às contas já existentes no sistema.

**Arquivo analisado:** `PLANILHA - CONTROLE DE VENDAS - V2.xlsx`

## Decisões fechadas (cliente) — implementação iniciada

| Tema | Decisão | Status |
|------|---------|--------|
| Conta | **P&P** (migrar `PEP` → `P&P`) | Feito no shared/seed/UI + migração DB |
| Canal | **Só Mercado Livre** | Import ignora SH; parser só seções ML |
| Dados | **Histórico antigo** | Script + API `/imports/controle-vendas` + tela `/importar` |

**Última carga local (planilha V2):** 409 produtos · 659 kits · 3 alíquotas · 16 vendas ML · estoque/entregas.

**Vendas (LISTA) já disponíveis** em `GET /sales` + tela `/vendas` com lucro/margem — os valores batem com a planilha (ex.: KITPAI2_3_5 lucro R$ 46,70 / 11,82%; AE10 15,06%).

**Baixa de estoque por kit** (`KitExplosionService`): ao enviar um pedido, o kit/PAR explode nos componentes (PAR ×2) e baixa o estoque da conta ativa.

### Implementação completa da planilha (todas as abas)

| Aba planilha | Sistema | Rota / tela |
|--------------|---------|-------------|
| **Dados** | Cadastro produtos, kits, alíquotas, R$/kg | Import + `/estoque` |
| **Dados_ML** | Staging + vendas ML | Import + `/vendas` |
| **LISTA** | Vendas com lucro/margem | `GET /sales` · `/vendas` |
| **ESTOQUE** | Saldo PCP/RC/P&P/total | `GET /products/stock-overview` · aba Estoque |
| **ENTREGAS** | Pedidos/entregas fornecedor | `GET/POST /purchasing/deliveries` · `/compras` |
| **PEDIDOS** | Sugestão de reposição | `GET /purchasing/suggestions` · `/reposicao` |
| **FINANCEIRO** | Custos + rateio % por conta/mês | `GET /finance/allocations` · aba Rateio em `/financeiro` |

---

## 1. Visão geral das abas

| Aba | Papel | Volume aprox. | Tipo |
|-----|--------|---------------|------|
| **Dados** | Cadastro mestre: SKUs, custos/kg, kits vinculados, alíquotas por conta, fornecedores, preço/kg por modelo | ~430 linhas úteis | Cadastro + fórmulas de custo |
| **Dados_ML** | Dump bruto do relatório de vendas do Mercado Livre (colar/importar) | até ~18k linhas | Dados brutos (sem fórmula) |
| **LISTA** | Vendas “trabalhadas”: data, conta, qtd, SKU, cliente, receita, custo, lucro, margem | espelha Dados_ML (~18k) | Derivada (centenas de milhares de fórmulas) |
| **ESTOQUE** | Saldo por produto nas contas PCP / RC / P&P + total | ~80 produtos | Derivada (entradas − saídas) |
| **FINANCEIRO** | Custos fixos/variáveis com **rateio %** por conta e mês | ~50 linhas × vários meses | Cadastro + rateio |
| **PEDIDOS** | Sugestão de reposição (quanto pedir) por conta e período | ~80 produtos | Derivada |
| **ENTREGAS** | Pedidos/entregas de fornecedor (entrada de estoque) por conta | blocos laterais por conta | Operacional |

Fluxo atual do cliente:

```text
Relatório ML (Excel) → cola em Dados_ML
        ↓
LISTA (HLOOKUP + custo + alíquota) → lucro/margem
        ↓
ESTOQUE (ENTREGAS − vendas LISTA, com explosão de kits)
        ↓
PEDIDOS (sugestão de compra) + FINANCEIRO (rateio)
```

---

## 2. Contas e canais na planilha

Na planilha as contas operacionais são:

| Conta planilha | Canal (v1) | Código no ERP |
|----------------|------------|---------------|
| **PCP** | só ML | `PCP` |
| **RC** | só ML | `RC` |
| **P&P** | só ML | `P&P` (migrar de `PEP`) |

Alíquotas (aba Dados): P&P ~9,04%, RC ~7,72%, PCP ~11,21% — usadas no lucro líquido da LISTA.

Linhas/contas **SH (Shopee)** na planilha: **ignorar na importação v1**.

Fornecedor principal visto: **Marciela** (por conta ML).

---

## 3. Detalhamento por aba

### 3.1 Dados (cadastro mestre)

Blocos principais:

1. **SKU base + custo + kg**  
   Ex.: `HBE1` custo R$ 8,90 · 1 kg. Custo de pares/kits costuma ser fórmula `kg × R$/kg` do modelo.

2. **Descrição + SKUs vinculados (kits)**  
   Lista de SKUs compostos (`PAR…`, `KIT…`) ligados a um item base (`HBP1`, `HBE1`…).  
   A explosão de kit é o coração do estoque: vender `KITPARHBP1_2` baixa 2 unidades do componente (×2 nos `PAR`).

3. **Impostos por conta**  
   Conta → alíquota %.

4. **Fornecedor por conta ML**  
   Ex.: P&P ML / RC ML / PCP ML → Marciela.

5. **Custo R$/kg por modelo**  
   HBE, HBP, HSE, HSP, AE, AS, AI, KET, PRESILHA, etc. (e colunas de fornecedores: Marciela, Delta, Kelly…).

### 3.2 Dados_ML (entrada bruta ML)

Cabeçalhos típicos do relatório oficial ML (~66 colunas), entre elas:

- Identificação: N.º de venda, Data, SKU, Título, Unidades, Comprador  
- Financeiro: Receita produtos, Tarifas, Envio, Total  
- Logística: rastreio, status, endereço  
- Fiscal: NF-e, documento, IE  

**Importante:** esta aba é “staging”. Quase não tem fórmula — é pasta de colagem.

### 3.3 LISTA (vendas enriquecidas)

Colunas de negócio:

| Coluna | Origem |
|--------|--------|
| DATA | Derivada da data ML (`MID`/`HLOOKUP` em Dados_ML) |
| CONTA | Ex.: `PCP ML` (conta + canal) |
| QUANT | Unidades |
| SKU | SKU do anúncio |
| DESCRIÇÃO | Título |
| NOME CLIENTE | Comprador |
| R$ SEM TARIFAS | Total líquido (após tarifas/envio) |
| R$ VENDA | Receita bruta produtos |
| CUSTO DO PRODUTO | Lookup em Dados (custo × qtd, com lógica de kit/modelo) |
| LUCRO BRUTO | `(líquido − custo) − (bruto × alíquota_conta)` |
| MARGEM | `lucro / bruto` |

Há **~180k fórmulas** — a planilha fica pesada; no sistema isso vira cálculo na API/importação, não célula a célula.

### 3.4 ESTOQUE

Por produto (descrição):

- Quantidade **PCP**, **RC**, **P&P**, **TOTAL**  
- Fórmula típica:  
  `entradas em ENTREGAS (status Entrega) − vendas na LISTA (SKU + kits que consomem o item, conta ML)`  
- Kits `PAR*` multiplicam consumo ×2.

Saldos negativos já aparecem (ex.: Halter 2 kg PCP = -2) — o sistema precisa permitir alerta de ruptura.

### 3.5 FINANCEIRO

- Grupos: **CUSTOS FIXOS** (pró-labore, salários, aluguel, contabilidade, Bling…) e **CUSTOS VARIÁVEIS** (internet, CEMIG, COPASA, embalagem…).  
- Cada linha tem valor e **rateio %** PCP / RC / P&P.  
- Blocos mensais (JULHO, AGOSTO…) com cópia da estrutura por conta.

### 3.6 PEDIDOS (sugestão de compra)

Filtro: conta (PCP/RC/P&P) + data inicial/final.

Colunas: descrição, qtd p/ pedido (manual), **qtd sugerida**, qtd vendida no período, estoque conta, estoque total.

Sugestão (resumo): se estoque ≤ vendido no período → sugerir arredondamento (`FLOOR(vendido+3, 2)`); senão “Estoque suficiente”.

### 3.7 ENTREGAS (compras / recebimento)

Blocos por conta (PCP | RC | P&P), cada um com colunas **Pedido** e **Entrega**, fornecedor, data, totais em kg e R$.

Linhas = produtos (mesma lista da ESTOQUE). Status “Pedido” / “Entrega” alimenta o estoque.

---

## 4. Como importar para o sistema

### 4.1 Estratégia recomendada (em fases)

| Fase | O quê | Por quê |
|------|--------|---------|
| **F1 – Staging ML** | Importar arquivo ML → `Dados_ML` equivalente (tabela `ml_sale_raw`) | Já temos fluxo Excel ML → Adiantar; reaproveitar parser |
| **F2 – Cadastro Dados** | Importar/manter SKUs, kits, alíquotas, R$/kg, fornecedores | Base para custo e explosão de estoque |
| **F3 – LISTA materializada** | Ao importar, gravar venda enriquecida (custo, lucro, margem, conta) | Elimina 180k fórmulas |
| **F4 – ENTREGAS + ESTOQUE** | Pedidos/entregas de fornecedor; saldo por conta via movimentos | Substitui SUMIF da planilha |
| **F5 – FINANCEIRO rateio** | Custos + % por conta/mês | Complementa financeiro atual |
| **F6 – PEDIDOS sugeridos** | Tela de reposição com a mesma regra | Substitui aba PEDIDOS |

### 4.2 Mapeamento conta e canal (fechado)

```text
Planilha "P&P" / "P&P ML"  →  SalesAccount.code = P&P   (migrar PEP → P&P)
Planilha "RC"  / "RC ML"   →  RC
Planilha "PCP" / "PCP ML"  →  PCP
Canal ML                   →  platform = MERCADOLIVRE
Canal SH / Shopee          →  NÃO importar na v1
```

### 4.3 Importação do histórico antigo

Escopo da carga inicial a partir da planilha V2:

| Origem | Destino no sistema | Observação |
|--------|--------------------|------------|
| **Dados** | produtos, kits, alíquotas, R$/kg, fornecedores | base para custo e estoque |
| **Dados_ML** (só linhas ML) | `MlSaleRaw` + vendas materializadas | ~18k linhas; filtrar se houver SH |
| **LISTA** | validar lucro/margem pós-import | pode recalcular na API em vez de copiar célula |
| **ENTREGAS** | pedidos/entregas por conta | necessário para bater estoque histórico |
| **ESTOQUE** | snapshot de conferência | reconciliar após movimentos; alertar divergência |
| **FINANCEIRO** | rateios mensais já preenchidos | importar meses existentes |
| **PEDIDOS** | opcional | é derivado; regenerar no sistema |

Ordem sugerida da carga: **Dados → ENTREGAS → Dados_ML/LISTA → reconciliar ESTOQUE → FINANCEIRO**.

---

## 5. Banco de dados (proposta)

Além do que já existe (`Product`, `SalesAccount`, `AccountStock`, `Order`, `FinanceEntry`…):

### Novas / ajustes

```text
Product
  + weightKg          Decimal?
  + modelCode        String?   // HBE, HBP, KET...
  + costPerKg         via tabela ModelCost

ProductKitComponent     // explosão de kits
  kitProductId
  componentProductId
  quantity              // ex.: PAR = 2 unidades do HBP1

AccountTaxRate
  accountId
  ratePercent           // 9.04, 7.72, 11.21
  channel               // ML | SHOPEE | ALL

SupplierAccount
  accountId
  supplierId
  channel

MlSaleRaw               // staging Dados_ML
  companyId, accountId?
  externalSaleId
  soldAt, sku, title, units
  revenueProducts, fees, shipping, total
  buyerName, status, rawJson

SaleLine (ou enriquecer Order/OrderItem)
  accountId, channel
  grossRevenue, netRevenue
  productCost, taxAmount, grossProfit, margin
  source = ML_IMPORT | MANUAL | API

PurchaseOrder / PurchaseDelivery (ENTREGAS)
  accountId, supplierId
  status = PEDIDO | ENTREGA
  orderedAt, lines (productId, qty, unitCost)

CostAllocation / CostAllocationLine (FINANCEIRO)
  month, category (FIXO|VARIAVEL), description, amount
  ratePep, rateRc, ratePcp
```

Estoque continua em `AccountStock` + `StockMovement`:  
**entrada** na confirmação de ENTREGA; **saída** na venda (explodindo kit).

---

## 6. Backend (Clean Architecture)

Módulos sugeridos em `backend/src/modules/`:

| Módulo | Use cases |
|--------|-----------|
| `catalog` | CRUD produto, kits, custo/kg, alíquotas |
| `marketplace-import` | Parse Excel ML → `MlSaleRaw` → gerar `SaleLine`/`Order` |
| `inventory` | Aplicar explosão de kit; recalcular saldo; alertas negativos |
| `purchasing` | Pedidos/entregas fornecedor; sugerir compra (regra PEDIDOS) |
| `finance-allocation` | Rateio mensal por conta |

Serviços de domínio críticos:

1. **KitExplosionService** — dado SKU vendido, retorna componentes × qtd  
2. **ProfitCalculator** — lucro = (líquido − custo) − (bruto × alíquota)  
3. **StockLedgerService** — aplica movimentos por conta  
4. **ReorderSuggestionService** — mesma regra da aba PEDIDOS  

Endpoints (exemplos):

- `POST /imports/mercadolivre/excel`  
- `GET /sales?account=&from=&to=`  
- `GET /stock?account=`  
- `POST /purchases` / `POST /purchases/:id/deliver`  
- `GET /purchases/suggestions?account=&from=&to=`  
- `GET/POST /finance/allocations`

---

## 7. Frontend (telas)

| Tela | Substitui aba | Conteúdo |
|------|---------------|----------|
| **Importar ML** | Dados_ML | Upload Excel; preview; escolher conta; confirmar |
| **Vendas / LISTA** | LISTA | Grid filtrável (conta, período, SKU, margem); export |
| **Cadastro produtos** | Dados | SKU, kg, modelo, kits vinculados, custo |
| **Alíquotas & fornecedores** | Dados (blocos) | Por conta/canal |
| **Estoque por conta** | ESTOQUE | Já existe — enriquecer com kits e alerta negativo |
| **Compras / Entregas** | ENTREGAS | Pedido → Entrega; totais kg/R$ |
| **Sugestão de pedido** | PEDIDOS | Conta + período → lista sugerida |
| **Financeiro rateio** | FINANCEIRO | Custos + % por conta + visão mensal |

UX: seletor de **conta ativa** (`P&P` / `RC` / `PCP`); importação só ML; histórico da planilha entra na carga inicial.

---

## 8. Regras de negócio a preservar

1. Conta = CNPJ/loja (PCP, RC, P&P) × canal **ML** (Shopee fora da v1).  
2. Custo do produto vem do cadastro (R$/kg × kg ou custo fixo do SKU).  
3. Lucro bruto da LISTA desconta **alíquota da conta** sobre a receita bruta.  
4. Estoque por conta: entregas − vendas; kits consomem componentes (PAR ×2).  
5. Sugestão de compra olha vendas do período vs estoque da conta.  
6. Financeiro rateia o mesmo custo entre contas por %.

---

## 9. Riscos e recomendações

| Risco | Mitigação |
|-------|-----------|
| Planilha com 18k linhas × fórmulas pesadas | Materializar no import; nunca replicar HLOOKUP em massa |
| Kits hardcoded nas fórmulas de ESTOQUE | Tabela `ProductKitComponent` editável |
| Código antigo `PEP` no ERP | Migrar para `P&P` (dados + UI + seeds) |
| Volume do histórico (~18k vendas) | Import em lote + idempotência por N.º de venda ML |
| Saldos negativos atuais | Importar snapshot opcional + reconciliação |
| Dados_ML muda layout ML | Parser por nome de coluna (já usamos Fuse/headers) |

---

## 10. Próximo passo sugerido

Decisões já fechadas: **P&P**, **só Meli**, **histórico antigo**.

1. Migrar conta `PEP` → `P&P` no schema/seed/UI.
2. Implementar **F1 + F3** com carga do histórico (Dados_ML → vendas com lucro/margem).
3. Importar **Dados + ENTREGAS**, reconciliar **ESTOQUE**.
4. Importar **FINANCEIRO** histórico; depois sugestão de **PEDIDOS** (derivado).

Este documento é o esboço de arquitetura para implementação incremental no monorepo `frontend/` + `backend/`.
