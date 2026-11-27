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
- `POST /gym/pix/webhook` (público, um só para todas as academias): valida `x-signature` (HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
  com a chave secreta), **consulta o pagamento na API** (nunca confia no corpo) e dá baixa. Idempotente: baixa condicional
  (`status = PENDING`) e aviso com `dedupeKey` por pagamento do MP. Respostas: 401 assinatura inválida, 503 sem configuração,
  200 processado/ignorado (pagamento inexistente, ex.: simulação do painel), 500 erro (o MP reenvia).
- Pix com valor menor que a mensalidade, ou pago numa mensalidade já paga/cancelada: **não** dá baixa e gera aviso
  "PAYMENT_ISSUE" para o dono conferir/devolver no MP.
- Baixa manual ou cancelamento da mensalidade cancelam o Pix em aberto no MP (sem travar se falhar).
- E-mail do pagador (o MP exige): o do aluno; sem e-mail, `MERCADOPAGO_PAYER_EMAIL` ou `aluno-<id>@gestaocgs.com`.
  CPF do aluno vai junto quando existir.
- Sem conta Mercado Pago conectada (e sem o token global de teste) a feature fica desligada: `pixEnabled: false`,
  botão desabilitado e endpoints respondem 503 pedindo para conectar.

### Conta Mercado Pago por academia (OAuth — "Conectar Mercado Pago")
Cada academia conecta a **própria** conta em *Regras automáticas › Recebimento por Pix*. O Pix de cada academia cai na
conta dela. Sem conta conectada o Pix fica desligado (`pixEnabled: false`; o botão na ficha aparece desabilitado com o link
"Conecte o Mercado Pago da academia").

- `GET /gym/mercadopago` (admin): status (`available`, `connected`, `pixEnabled`, `testMode`, `needsReconnect`, conta: user_id,
  apelido, e-mail, desde quando). Nunca devolve token.
- `POST /gym/mercadopago/authorize` (admin): devolve a URL `https://auth.mercadopago.com.br/authorization` com `client_id`,
  `redirect_uri`, `state` e PKCE (`code_challenge`, S256). O `state` é assinado (HMAC), ligado à academia e ao usuário,
  vale 10 min e é de **uso único** (nonce gravado na academia e consumido no callback).
- `GET /gym/mercadopago/callback` (público, o navegador do dono volta do MP): confere o state, troca o `code` em
  `POST /oauth/token` (com `code_verifier`), busca apelido/e-mail em `/users/me` e grava. Redireciona para
  `<FRONTEND_URL>/academia/configuracoes?mp=connected` (ou `?mp=error&motivo=negado|expirado|token|indisponivel`).
- `POST /gym/mercadopago/disconnect` (admin): apaga os tokens. (O dono também pode revogar no MP em
  Seu perfil › Segurança › Aplicações conectadas; aí o sistema pede "Conectar de novo".)
- Tokens (`access_token` e `refresh_token`) ficam **criptografados** no banco (AES-256-GCM, chave
  `MERCADOPAGO_TOKEN_ENCRYPTION_KEY`), tabela `MercadoPagoConnection` (user_id, public_key, live_mode, expiração, conexão).
- Renovação: o token do MP vale 180 dias. Ao usar, se faltar menos de 15 dias, renova com `refresh_token`; a rotina diária
  (`/gym/cron`) também renova os que vencem em 15 dias. Se o MP recusar (acesso revogado), marca "Conecte de novo".
- Pix usa o token da academia. Webhook: descobre a academia pela mensalidade com aquele id do MP ou pelo `user_id` da
  notificação, consulta o pagamento **com o token dela** e só baixa mensalidade **da mesma academia** (pagamento de outra
  conta apontando para mensalidade alheia é ignorado).
- Trocar a `MERCADOPAGO_TOKEN_ENCRYPTION_KEY` invalida os tokens gravados: as academias precisam conectar de novo.

### Envs (Vercel → Project Settings → Environment Variables → Production)
| Env | Obrigatória | O que é |
| --- | --- | --- |
| `MERCADOPAGO_CLIENT_ID` | sim | "Client ID" / número da aplicação no MP Developers. |
| `MERCADOPAGO_CLIENT_SECRET` | sim | "Client Secret" da aplicação. |
| `MERCADOPAGO_REDIRECT_URI` | sim | `https://backendrh-gamma.vercel.app/gym/mercadopago/callback` (igual à cadastrada na aplicação). |
| `MERCADOPAGO_TOKEN_ENCRYPTION_KEY` | sim | Chave para criptografar os tokens: 64 caracteres hex (ex.: `openssl rand -hex 32`). Não perca nem troque. |
| `MERCADOPAGO_WEBHOOK_SECRET` | sim | Assinatura secreta do webhook da aplicação. |
| `FRONTEND_URL` | recomendada | `https://gestaocgs.com` (para onde o dono volta depois de conectar). Já existe por causa do Stripe. |
| `MERCADOPAGO_OAUTH_PKCE` | não | `false` desliga o PKCE (só se não habilitar PKCE na aplicação). Padrão: ligado. |
| `MERCADOPAGO_RETURN_URL` | não | Outra URL de volta (padrão `<FRONTEND_URL>/academia/configuracoes`). |
| `MERCADOPAGO_PIX_EXPIRATION_MINUTES` | não | Validade do Pix (30 a 43200). Padrão 4320 = 3 dias. |
| `MERCADOPAGO_PAYER_EMAIL` | não | E-mail usado quando o aluno não tem e-mail. |
| `MERCADOPAGO_ACCESS_TOKEN` | **não (só teste)** | Token global. Se existir, academias **sem** conta conectada usam essa conta (modo teste/legado). Em produção, não configure. |
| `MERCADOPAGO_API_BASE` / `MERCADOPAGO_AUTH_BASE` | não | Só para testes locais com servidor falso. |

### Passo a passo do Francisco (uma vez, para todas as academias)
1. Em https://www.mercadopago.com.br/developers/panel/app → **Criar aplicação** (com a conta do Sistema CGS).
   Tipo: pagamentos online / Checkout Transparente; marque que vai integrar **para terceiros (marketplace / OAuth)**.
2. Na aplicação → **Editar** (detalhes da aplicação):
   - **URLs de redirecionamento**: `https://backendrh-gamma.vercel.app/gym/mercadopago/callback`
   - Habilite **"fluxo de código de autorização com PKCE"** (recomendado; o sistema já manda o PKCE).
3. Copie **Client ID** e **Client Secret** (Credenciais de produção).
4. **Webhooks → Configurar notificações**: URL de produção `https://backendrh-gamma.vercel.app/gym/pix/webhook`,
   evento **Pagamentos**. Salve e copie a **assinatura secreta**.
5. Gere a chave de criptografia (64 hex), ex.: `openssl rand -hex 32` (ou o arquivo gerado no box), e guarde num lugar seguro.
6. Na Vercel (backend) crie as envs obrigatórias da tabela em **Production**. Se tinha criado `MERCADOPAGO_ACCESS_TOKEN`
   antes, **apague** (senão academias sem conta conectada cobram na conta dele).
7. Deploy (push na main ou Redeploy). **Atenção:** o build roda `prisma migrate deploy` e aplica na Neon as migrations
   `20261127010000_academia_pix` e `20261127030000_academia_mercadopago_oauth` (só adicionam; nada é apagado).

### O que o dono da academia faz
1. Ter conta Mercado Pago com **chave Pix cadastrada** (app do MP › Pix › Minhas chaves).
2. No sistema: *Regras automáticas › Recebimento por Pix › **Conectar Mercado Pago*** → entra no MP → **Autorizar**.
   Volta para o sistema com "Conectado à conta …". Pronto: o botão "Cobrar via Pix" já funciona na ficha dos alunos.

### Testar
- Use **contas de teste** do MP (Suas integrações › Contas de teste): crie um vendedor de teste, entre com ele no
  navegador e clique em Conectar; o Pix gerado é de teste. Um comprador de teste não paga Pix por banco real.
- Localmente, os testes usam um servidor falso do MP (Payments + OAuth): `MERCADOPAGO_API_BASE` e `MERCADOPAGO_AUTH_BASE`
  apontando para ele.
- `npm test` cobre criptografia, state assinado, PKCE, URL de autorização, troca/renovação de token (fetch mockado),
  assinatura do webhook e decisão de baixa.

## Ainda não implementado
- Agente local da catraca (C# x86 + EasyInner) e rotas de dispositivo; cadastro de digitais.
- Bloqueio de inadimplente na catraca, importação do Secullum, cobrança por Pix.
