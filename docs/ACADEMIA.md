# Módulo Academia

## Tipo de empresa (`Organization.businessType`)
- `STANDARD` (padrão): sistema atual (clientes, carnês, ponto, estoque). Rotas `/gym/*` respondem 403.
- `GYM`: somente o módulo Academia. Rotas de clientes, carnês, ponto, categorias, produtos e estoque respondem 403
  (`code: BUSINESS_TYPE_NOT_ALLOWED`). Usuários, organização e assinatura continuam disponíveis.
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

## Regras automáticas
- 7 dias sem presença: "em risco" + aviso. 30 dias: desativa + aviso. Presença reativa (exceto desativado manual).
- Plano vencendo / vencido: avisos; opcionalmente desativa após a carência.
- Roda às 06:00 e 18:00 (node-cron, se o servidor ficar ligado), ao abrir o painel (se passou 6h) e por
  `GET /gym/cron` com `Authorization: Bearer <CRON_SECRET>` (para cron externo em serverless).

## Ainda não implementado
- Agente local da catraca (C# x86 + EasyInner) e rotas de dispositivo; cadastro de digitais.
- Bloqueio de inadimplente na catraca, importação do Secullum, cobrança por Pix.
