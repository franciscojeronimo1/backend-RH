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

## Ainda não implementado
- Agente local da catraca (C# x86 + EasyInner) e rotas de dispositivo; cadastro de digitais.
- Bloqueio de inadimplente na catraca, importação do Secullum, cobrança por Pix.
