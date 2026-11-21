# Módulo Academia — controle inteligente de alunos

Os **clientes** da organização são tratados como **alunos**. O módulo fica desligado por padrão
e só age em organizações que o ativarem (Painel da academia → "Ativar agora" ou `PUT /gym/settings { enabled: true }`).

## O que o sistema faz sozinho
| Situação | Padrão | Ação |
|---|---|---|
| X dias sem treinar | 7 | status **Em risco** + aviso |
| Y dias sem treinar | 30 | **desativa** (`active=false`) + aviso |
| Aluno inativo registra presença | ligado | **reativa** + aviso |
| Plano vence em até N dias | 5 | aviso |
| Plano vencido | — | aviso (opcional: desativar após carência) |

- Contagem de ausência = desde a última presença **ou** desde o cadastro/reativação (o mais recente).
- Ao ligar o módulo, alunos sem histórico ganham carência a partir do dia da ativação.
- Alunos com "controle automático" desligado nunca são alterados pelo sistema.
- Idempotente: updates condicionais + avisos com `dedupeKey` única por organização.

## Quando a rotina roda
1. `node-cron` às 06:00 e 18:00 (America/Sao_Paulo) + 1x ao subir o servidor (`src/jobs/gymScheduler.ts`).
   Desligue com `GYM_SCHEDULER_DISABLED=true`.
2. Ao abrir o painel (`GET /gym/dashboard`), se a última análise tiver mais de 6h (cobre serverless).
3. Cron externo: `GET /gym/cron` com header `Authorization: Bearer $CRON_SECRET` (ex.: Vercel Cron).
4. Manual: botão "Analisar agora" (`POST /gym/evaluate`) ou `npm run gym:evaluate`.

## Endpoints (auth + tenant)
- `GET/PUT /gym/settings` (PUT só ADMIN)
- `GET /gym/dashboard`, `POST /gym/evaluate` (ADMIN)
- `GET /gym/members?status=ALL|ACTIVE|AT_RISK|INACTIVE|PLAN_EXPIRING|PLAN_EXPIRED&search=&page=&limit=`
- `GET/PATCH /gym/members/:id` (`planName`, `planExpiresAt` AAAA-MM-DD, `autoControl`)
- `POST /gym/members/:id/deactivate` (ADMIN), `POST /gym/members/:id/reactivate`
- `POST /gym/checkins { clientId }`, `GET /gym/checkins?date=AAAA-MM-DD`, `DELETE /gym/checkins/:id`
- `GET /gym/notifications?unreadOnly=true`, `GET /gym/notifications/unread-count`,
  `POST /gym/notifications/:id/read`, `POST /gym/notifications/read-all`

## Banco
Migration: `prisma/migrations/20261121180000_academia_controle_alunos` (só adiciona colunas/tabelas, não apaga nada).
Aplicar: `npx prisma migrate deploy` (o `npm run build` também aplica).

## Testes
`npm test` — regras puras em `tests/memberRules.test.ts`.
