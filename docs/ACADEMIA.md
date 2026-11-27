# Módulo Academia

## Tipo de empresa (`Organization.businessType`)
- `STANDARD` (padrão): sistema atual (clientes, carnês, ponto, estoque). Rotas `/gym/*` respondem 403.
- `GYM`: somente o módulo Academia. Rotas de clientes, carnês, ponto, categorias, produtos e estoque respondem 403
  (`code: BUSINESS_TYPE_NOT_ALLOWED`). Usuários, organização e assinatura continuam disponíveis na API
  (login/perfil), mas o front não mostra a tela de Administração para academias.
- Não há tela para trocar o tipo: é marcado direto no banco.

## Cobrança manual (`Organization.billingExempt`)
- `true`: `premiumMiddleware` libera tudo; `GET /subscription` devolve `isPremium: true`, `needsPayment: false`,
  `billingManaged: "MANUAL"`; checkout e portal do Stripe respondem 400 (`BILLING_MANAGED_MANUALLY`).
- O front esconde card de assinatura, banners e coroa Premium.

Ativar uma academia (SQL, no Neon, depois da migração):
```sql
UPDATE "Organization" SET "businessType" = 'GYM', "billingExempt" = true WHERE id = '<id-da-organizacao>';
```

## Entidades
- `Member`: aluno (separado de `Client`). `accessCode` = senha numérica da catraca, única por academia
  (gerada com 6 dígitos se não for informada). Status `ACTIVE` / `AT_RISK` / `INACTIVE`.
- `MembershipPlan`: planos da academia (preço, duração em meses + dias).
- `Membership`: matrícula/renovação. Sem data de início, começa hoje ou no dia seguinte ao fim do plano atual.
  Mensal começando 15/01 vale até 14/02. Atualiza `Member.planName`/`planExpiresAt` (cópia do plano vigente).
- `Payment`: mensalidade (pendente/paga/cancelada, forma de pagamento, quem recebeu).
- `AccessEvent`: toda passagem (check-in manual da recepção ou catraca), com método
  (`MANUAL`/`PASSWORD`/`FINGERPRINT`/`CARD`), sentido e resultado (liberado/negado + motivo).
  Presença = evento `GRANTED` + `IN`.
- `AccessDevice`: catraca / leitor biométrico; o agente local vai se autenticar com uma chave (só o hash é salvo).
- `MemberCredential`: digital (template/ID no leitor), cartão ou senha extra do aluno.
- `GymSettings` e `Notification`: regras automáticas e avisos.
- Aluno nunca é apagado: `DELETE /gym/members/:id` só desativa (`INACTIVE`, motivo `MANUAL`) e preserva o
  histórico. No banco, as FKs de matrículas, mensalidades, acessos, credenciais e avisos para `Member` são
  `NO ACTION` (sem cascade), então um `DELETE` direto em `Member` com histórico falha.

## Importação de alunos (Secullum / planilha)
- Tela: Alunos → **Importar** (só administrador). API: `POST /gym/members/import/preview` (não grava) e
  `POST /gym/members/import` (grava), corpo `{ file: <base64>, fileName, headerRow?, mapping?, duplicates?: 'skip'|'update',
  createPlans?, importInactive? }`.
- Formatos: CSV/TXT (`;` `,` TAB; UTF-8 ou Latin-1), XLSX e XLS. O cabeçalho pode vir depois de linhas de título do relatório.
- Colunas reconhecidas pelo título (sem acento): Nome, CPF, Celular/Telefone, E-mail, Data Nascimento, Senha/Cartão,
  Número/Código, RG, Sexo, Endereço/Bairro/Cidade/UF/CEP, Situação, Serviço/Plano, Valor, Vencimento, Início, Data Inscrição,
  Observação. O usuário pode trocar o mapeamento na tela.
- Regras: nome obrigatório; CPF inválido/telefone/data errados viram aviso (importa sem o campo); CPF ou nome (sem CPF)
  repetido no arquivo = erro na linha; aluno já cadastrado (CPF, ou nome + nascimento) é pulado ou atualizado;
  senha da catraca repetida/fora do padrão → gera outra (6 dígitos); "Inativo/Bloqueado/Cancelado" → aluno inativo.
- Com Serviço + Vencimento: cria o plano se não existir (duração pelo nome: mensal, trimestral, semestral, anual…) e a
  matrícula vigente (sem mensalidade). RG, endereço, código antigo e data de inscrição vão para as observações.
- A contagem de ausência dos importados começa no dia da importação. Limite: 5.000 linhas / ~3 MB por arquivo.

## Regras automáticas
- 7 dias sem presença: "em risco" + aviso. 30 dias: desativa + aviso. Presença reativa (exceto desativado manual).
- Plano vencendo / vencido: avisos; opcionalmente desativa após a carência.
- Produção (Vercel): o **Vercel Cron** chama `GET /gym/cron` todo dia às 06:00 UTC (03:00 de Brasília; no plano Hobby
  pode cair em qualquer minuto dessa hora), configurado em `vercel.json`. A Vercel envia `Authorization: Bearer <CRON_SECRET>`
  sozinha quando a env `CRON_SECRET` existe. Sem a env o endpoint responde 503; header errado, 401.
- Local/servidor sempre ligado: node-cron às 06:00 e 18:00 (Brasília) e uma vez ao subir. Desligado na Vercel
  (`VERCEL` definido) ou com `GYM_SCHEDULER_DISABLED=true`.
- Também roda ao abrir o painel (se passou 6h). Idempotente: avisos têm `dedupeKey` única, rodar 2x não duplica.

## Painel do dono (`GET /gym/dashboard`)
- Qualquer usuário da academia: alunos ativos / em risco / inativos, novos no mês, desativados no mês, presenças, planos vencendo/vencidos, alunos em risco e últimos avisos.
- Só administrador (dono) recebe `finance`: receita do mês (mensalidades pagas no mês), a receber (pendentes a vencer), em atraso (pendentes vencidas), inadimplentes (top 10 por dias de atraso, agrupados por aluno) e série dos últimos 6 meses (receita, novos, desativados). Para funcionário vem `finance: null`.
- Cálculos puros em `src/services/gym/ownerDashboard.ts` (testes em `tests/ownerDashboard.test.ts`, sem banco).
- "Novos no mês" usa a data de cadastro. Na importação, se a planilha tiver "aluno desde", ela vira a data de cadastro (o aluno importado não conta como novo).

## Cobrança por Pix (Mercado Pago)

Na ficha do aluno, cada mensalidade pendente tem **Cobrar via Pix** (só administrador). O modal mostra QR Code,
Pix copia-e-cola (botão Copiar) e **Enviar no WhatsApp** com a mensagem pronta. Quando o aluno paga, a mensalidade
é baixada sozinha (método Pix, "automático (Mercado Pago)") e aparece o aviso "Pix recebido".

### Como funciona
- `POST /gym/payments/:paymentId/pix` (admin): cria o Pix na API de Payments do MP (`payment_method_id: "pix"`,
  `external_reference: "gym-payment:<id>"`, header `X-Idempotency-Key`). Se já houver cobrança pendente que vale por mais
  de 10 min com o mesmo valor, **reaproveita** (não cria outra). Expirou ou mudou o valor: cancela a antiga e cria nova.
- `GET /gym/payments/:paymentId/pix` (admin): situação. Se ainda pendente, consulta o MP e dá baixa se já foi pago
  (o modal chama a cada 5 s; cobre webhook atrasado/perdido).
- `POST /gym/pix/webhook` (público): valida `x-signature` (HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
  com a chave secreta), **consulta o pagamento na API** (nunca confia no corpo) e dá baixa. Idempotente: baixa condicional
  (`status = PENDING`) e aviso com `dedupeKey` por pagamento do MP. Respostas: 401 assinatura inválida, 503 sem configuração,
  200 processado/ignorado (pagamento inexistente, ex.: simulação do painel), 500 erro (o MP reenvia).
- Pix com valor menor que a mensalidade, ou pago numa mensalidade já paga/cancelada: **não** dá baixa e gera aviso
  "PAYMENT_ISSUE" para o dono conferir/devolver no MP.
- Baixa manual ou cancelamento da mensalidade cancelam o Pix em aberto no MP (sem travar se falhar).
- E-mail do pagador (o MP exige): o do aluno; sem e-mail, `MERCADOPAGO_PAYER_EMAIL` ou `aluno-<id>@gestaocgs.com`.
  CPF do aluno vai junto quando existir.
- Sem `MERCADOPAGO_ACCESS_TOKEN` a feature fica desligada: a lista de mensalidades devolve `pixEnabled: false`,
  o botão aparece desabilitado e os endpoints respondem 503 com mensagem amigável.
- Hoje a conta do MP é **global** (uma só, por env). Para cada academia receber na própria conta, o próximo passo é
  guardar o token por organização (ou OAuth do MP) em vez da env.

### Envs (Vercel → Project Settings → Environment Variables → Production)
| Env | Obrigatória | O que é |
| --- | --- | --- |
| `MERCADOPAGO_ACCESS_TOKEN` | sim | Access Token de **produção** (`APP_USR-...`). Sem ela o Pix fica desligado. |
| `MERCADOPAGO_WEBHOOK_SECRET` | sim p/ webhook | Assinatura secreta gerada em Webhooks no painel do MP. Sem ela o webhook responde 503 (a baixa ainda acontece pelo modal aberto). |
| `MERCADOPAGO_PIX_EXPIRATION_MINUTES` | não | Validade do Pix (30 a 43200). Padrão 4320 = 3 dias. |
| `MERCADOPAGO_PAYER_EMAIL` | não | E-mail usado quando o aluno não tem e-mail. |
| `MERCADOPAGO_NOTIFICATION_URL` | não | Força `notification_url` em cada pagamento (normalmente não precisa: use o webhook do painel). |
| `MERCADOPAGO_API_BASE` | não | Só para testes locais com servidor falso. Não configure em produção. |

### Passo a passo (produção)
1. Criar/entrar na conta Mercado Pago da academia (conta de vendedor) e **cadastrar uma chave Pix** nela
   (sem chave Pix o MP não gera QR).
2. Em https://www.mercadopago.com.br/developers/panel/app → **Criar aplicação** (produto: Checkout Transparente / pagamentos online).
3. Na aplicação → **Credenciais de produção** → copiar o **Access Token** (`APP_USR-...`). Não compartilhar.
4. Na aplicação → **Webhooks → Configurar notificações**:
   - URL modo produção: `https://backendrh-gamma.vercel.app/gym/pix/webhook`
   - Evento: **Pagamentos** (`payment`)
   - Salvar e copiar a **assinatura secreta** gerada.
5. Na Vercel (projeto do backend) criar `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` em **Production**.
6. Fazer o deploy (push na main ou Redeploy). **Atenção:** o build roda `prisma migrate deploy`, que aplica a migration
   `20261127010000_academia_pix` na Neon (só adiciona colunas e valores de enum; nada é apagado).
7. Testar: gerar um Pix de valor baixo (ex.: R$ 1,00) numa mensalidade de teste, pagar pelo app do banco e ver a baixa
   automática + aviso. No painel do MP, Webhooks mostra as entregas (status 200).

### Testar sem dinheiro real
- Credenciais de **teste** do MP (Access Token `TEST-...` da aplicação, ou de um usuário de teste) geram Pix de teste
  que não podem ser pagos por banco real. Use a URL de webhook de **modo teste** no painel e o botão "Simular" para
  conferir a assinatura (a simulação usa um id que não existe: o endpoint responde 200 e ignora).
- Localmente, os testes usam um servidor falso: `MERCADOPAGO_API_BASE=http://localhost:3398`.
- `npm test` cobre assinatura, montagem da requisição (fetch mockado, sem rede), decisão de baixa e respostas do webhook.

## Ainda não implementado
- Agente local da catraca (C# x86 + EasyInner) e rotas de dispositivo; cadastro de digitais.
- Bloqueio de inadimplente na catraca, importação do Secullum, cobrança por Pix.
