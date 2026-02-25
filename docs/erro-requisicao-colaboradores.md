# Possíveis causas do "Erro na requisição" (Meus Colaboradores)

O endpoint que a tela **Meus Colaboradores** usa é **GET /users**, protegido por autenticação. Abaixo estão as causas mais prováveis do erro ocorrer **várias vezes ao dia** e o que fazer em cada caso.

---

## 1. Token expirado (muito provável)

- O JWT expira em **24h** (`generateToken` com `expiresIn: '24h'`).
- Se o usuário deixa a aba aberta ou usa o app ao longo do dia, após 24h o `authMiddleware` responde **401** com "Token inválido ou expirado".
- O front provavelmente trata qualquer falha (401, 500, rede) como **"Erro na requisição. Tente novamente."**, sem distinguir token expirado.

**O que fazer:**  
- No **front**: para status 401 na listagem de colaboradores, mostrar mensagem específica: *"Sessão expirada. Faça login novamente."* e redirecionar para login.  
- Opcional: refresh token ou aumentar `expiresIn` (ex.: 7d), balanceando segurança.

---

## 2. Banco (Neon) “acordando” (scale-to-zero)

- O projeto usa **Neon** com `connectionTimeoutMillis: 10000` (10s).
- Quando o compute do Neon está **suspenso** (scale-to-zero), a **primeira** requisição do dia (ou após inatividade) pode demorar mais de 10s para estabelecer conexão e resultar em **timeout**.
- Isso explica erro **intermitente** (várias vezes ao dia, especialmente na primeira vez ou após pausa).

**O que fazer:**  
- Aumentar `connectionTimeoutMillis` (ex.: 20s ou 30s) para dar tempo do Neon “acordar”.  
- Ou manter um **warm-up** periódico (ex.: cron chamando um health check que toca o banco) para reduzir cold starts.

---

## 3. Rate limit (100 req / 15 min por IP)

- Há **rate limit geral**: **100 requisições por IP a cada 15 minutos** (`generalLimiter` no `server.ts`).
- Em rede corporativa (mesmo IP para vários usuários) ou usuário que recarrega muito a página, o limite pode ser atingido e a API responde **429**.
- Se o front trata qualquer erro como “Erro na requisição”, o usuário vê a mesma mensagem.

**O que fazer:**  
- No **front**: para status **429**, mostrar: *"Muitas requisições. Aguarde alguns minutos e tente novamente."*  
- No **back**: considerar rate limit por usuário (ex.: por `req.user.id`) em vez de só por IP, ou aumentar o limite para rotas de leitura como GET /users.

---

## 4. Erros de conexão com o banco não tratados de forma amigável

- O `errorHandler` trata bem **P2002** e **P2025** do Prisma.
- Outros erros do Prisma (ex.: **P1001** – servidor inacessível, **P1017** – conexão fechada, timeouts) caem em “Erro no banco de dados” ou no genérico **500**.
- O usuário vê “Erro na requisição” sem saber se foi token, rede ou banco.

**O que fazer:**  
- Incluir no `errorHandler` tratamento para códigos como **P1001**, **P1017** e timeouts, retornando uma mensagem estável (ex.: *"Falha temporária ao conectar. Tente novamente em instantes."*) e status 503.  
- Assim o front pode exibir mensagem mais clara e, se quiser, retry automático.

---

## 5. Resumo de ações recomendadas

| Onde        | Ação |
|------------|------|
| **Front**  | Tratar 401 na listagem de colaboradores com mensagem “Sessão expirada. Faça login novamente.” e redirecionar para login. |
| **Front**  | Tratar 429 com mensagem específica e orientar a aguardar. |
| **Back**   | Tratar no `errorHandler` erros de conexão/timeout do Prisma (P1001, P1017, etc.) com mensagem amigável e 503. |
| **Back**   | Avaliar aumentar `connectionTimeoutMillis` no `prismaClient` (ex.: 20–30s) para reduzir falhas em cold start do Neon. |
| **Back**   | (Opcional) Rate limit por usuário ou limite mais alto para GET /users. |

Com isso, o “Erro na requisição” deixa de ser genérico e o usuário passa a ver mensagens que correspondem ao que realmente falhou (token, muitas requisições, ou falha temporária do servidor/banco).
