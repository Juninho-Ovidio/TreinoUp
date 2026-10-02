# TreinoUp

Aplicativo de acompanhamento nutricional e fitness: diário alimentar, macros, água, peso, medidas, receitas, treinos e gasto calórico. PWA mobile-first (instala na tela inicial do celular), com modo claro e escuro.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Storage, RLS) · Open Food Facts · Vitest.

> **App mobile** (iOS e Android) em [`mobile/`](mobile/README.md): o TreinoUp num app só, somando corrida, pedal e trilha com GPS e rede social. É um projeto Expo com o próprio `package.json`; o build e o deploy do site ignoram essa pasta. Site e app usam **o mesmo projeto Supabase**, com login único. As tabelas novas do app ficam em schemas próprios (ex.: `privacy`), e o perfil ganhou colunas novas (`username`, `bio`, `city`, `profile_visibility`). Testes do banco inteiro: `npm run test:db`.
>
> **Pontos de restauração:** a tag `restauracao/antes-app-mobile` marca o código antes do app (`git checkout restauracao/antes-app-mobile`), e `supabase/rollback/20261002000001_run_fundacao_down.sql` desfaz no banco a migration do app (rode no SQL Editor; é testado em `supabase/tests/rollback.test.mjs`).

---

## 1. Rodar no seu computador

Pré-requisitos: Node.js 20 ou mais novo e uma conta gratuita no [Supabase](https://supabase.com).

### 1.1 Criar o projeto no Supabase

1. Em [supabase.com/dashboard](https://supabase.com/dashboard), crie um projeto novo (região São Paulo, se estiver no Brasil).
2. Abra **SQL Editor → New query**, cole o conteúdo de `supabase/setup.sql` e rode (uma vez só). Ele reúne as migrations: esquema + RLS, catálogo de exercícios, permissões da API, catálogo brasileiro de alimentos (TACO, 591 itens) e a busca sem acento.
3. Em **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** adicione `http://localhost:3000/**`
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

> Para testar mais rápido, você pode desligar a confirmação de e-mail em **Authentication → Providers → Email → Confirm email**. Com ela ligada, o cadastro envia um link e o usuário continua pelo e-mail.

Se preferir a CLI do Supabase: `supabase link --project-ref SEU_REF` e `supabase db push`.

### 1.2 Configurar e iniciar

```bash
npm install
cp .env.example .env.local     # preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Abra `http://localhost:3000`. Para testar no celular na mesma rede, use o IP do computador (ex.: `http://192.168.0.10:3000`) e adicione esse endereço nas Redirect URLs do Supabase. A câmera (scanner) só funciona em HTTPS ou em `localhost`; no celular, use o deploy (seção 4) ou um túnel HTTPS.

### 1.3 Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` e `npm start` | Build e servidor de produção (o service worker/PWA só é registrado em produção) |
| `npm test` | Testes dos cálculos (macros, metas, receitas, exercício, datas) |
| `npm run test:db` | Aplica todas as migrations num Postgres em WASM (PGlite) e testa RLS, triggers e regras |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint |
| `npm run import:foods arquivo.csv -- --source taco` | Importa uma base oficial de alimentos (seção 3) |

---

## 2. Estrutura

```
src/
├─ app/
│  ├─ (auth)/            boas-vindas, login, cadastro, recuperar-senha
│  ├─ (app)/             telas com login: inicio, diario, progresso, perfil, alimentos,
│  │                     receitas, treinos, assistente, premium
│  ├─ onboarding/        7 etapas até "Seu plano está pronto."
│  ├─ auth/callback/     retorno dos links de e-mail e do login social
│  ├─ api/foods/         busca e código de barras (Open Food Facts), exige login
│  └─ manifest.ts        manifesto PWA
├─ components/
│  ├─ ui/                Button, Field, Card, Sheet, Toast, Confirm, Ring/Bar, Segmented
│  ├─ app/               BottomNav, menu "+", folhas de água/peso/exercício, AddFoodSheet…
│  └─ charts/            LineChart e BarChart em SVG (interativos, sem biblioteca)
├─ data/                 acesso ao Supabase por assunto (diary, foods, recipes, body…)
├─ hooks/                useQuery (cache leve) e useDay (tudo de um dia)
├─ lib/                  regras puras e testadas: nutrition, goals, exercise, dates,
│                        assistant, plans; foods/ = camada de bases externas
└─ middleware.ts         renova a sessão e protege as rotas
supabase/migrations/     esquema, RLS, triggers e seed
scripts/                 importação de alimentos por CSV
tests/                   Vitest
public/                  ícones, service worker, página offline
```

**Banco de dados** (todas as tabelas com Row Level Security: cada usuário só lê e altera o que é seu):
`profiles`, `goals`, `meals`, `foods`, `food_favorites`, `food_entries`, `recipes`, `recipe_ingredients`, `water_entries`, `weight_entries`, `body_measurements`, `exercises`, `workouts`, `workout_exercises`, `activity_entries`, `notifications`. A tabela de usuários é a `auth.users` do Supabase; um trigger cria perfil, refeições padrão e lembretes no cadastro.

---

## 3. Dados nutricionais

O app **não traz valores nutricionais inventados**. As fontes são:

1. **Tabela TACO** (Unicamp, 4ª ed., 2011): 591 alimentos brasileiros em português, já no banco pela migration `20261001000001`. Fonte dos dados: NEPA/UNICAMP, reprodução permitida citando a fonte.
2. **Open Food Facts** (produtos embalados vendidos no Brasil, busca por nome, marca e código de barras). Base aberta e colaborativa (licença ODbL). O app mostra a fonte e pede para conferir com a embalagem.
3. **Alimentos do usuário**, cadastrados com os dados do rótulo.
4. **Outro catálogo importado** por você (por exemplo USDA ou uma base própria) por CSV:
   ```bash
   # CSV com colunas: id, name, kcal_100g, protein_100g, carbs_100g, fat_100g (+ opcionais)
   SUPABASE_SERVICE_ROLE_KEY=... npm run import:foods taco.csv -- --source taco
   ```
   Veja o cabeçalho de `scripts/import-foods-csv.mjs` para todas as colunas. Confira a licença da base antes de importar.

Para plugar outra base (USDA, uma API paga), implemente a interface `FoodProvider` em `src/lib/foods/provider.ts` e registre em `src/lib/foods/index.ts`.

---

## 4. Publicar (Vercel)

1. Suba o projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com), importe o repositório e configure as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL` (a URL final, ex.: `https://treinoup.vercel.app`).
3. No Supabase, troque o **Site URL** para a URL final e adicione `https://SEU-DOMINIO/auth/callback` às Redirect URLs.
4. No celular, abra o site e use **Adicionar à tela de início**.

---

## 5. Pontos de extensão já preparados

| Recurso | Onde está | O que falta |
| --- | --- | --- |
| Login com Google e Apple | `components/app/OAuthButtons.tsx` | Configurar o provedor no Supabase e definir `NEXT_PUBLIC_AUTH_GOOGLE=true` / `NEXT_PUBLIC_AUTH_APPLE=true` |
| Premium | `lib/plans.ts`, campo `profiles.plan` | Integrar pagamento (Stripe, Mercado Pago, RevenueCat) com um webhook que altera `plan` usando a service role. O cliente não consegue se promover (trigger `protect_profile_plan`). Para testar, use `NEXT_PUBLIC_ALL_PREMIUM=true` |
| Assistente Nutri com IA | `lib/assistant.ts` (`AssistantProvider`) | Hoje responde por regras, só com os dados do usuário. Para usar um modelo de linguagem, crie uma rota `/api/assistente` no servidor e um provider que a chame com o mesmo contexto |
| Lembretes com o app fechado | `components/app/ReminderScheduler.tsx`, `public/sw.js` | Hoje disparam com o app aberto. Para push real: Web Push (chaves VAPID) + um agendador no servidor (ex.: Supabase Cron + Edge Function) |
| App Android/iOS | toda a lógica em `lib/` e `data/` é independente de tela | Empacotar o PWA com Capacitor, ou reescrever as telas em Expo reaproveitando `lib/` |
| Unidades imperiais | campo `profiles.units` | Converter na exibição e na entrada |

---

## 6. O que foi verificado e o que precisa de teste seu

Verificado antes da entrega:
- As migrations rodaram num PostgreSQL 16 com um stub do `auth` do Supabase. Os testes de RLS confirmaram que um usuário não lê nem grava dados de outro, que não consegue se promover a Premium e que excluir a conta apaga tudo em cascata (inclusive receitas feitas com alimentos próprios).
- 25 testes dos cálculos passaram (macros, unidades, receitas por porção, Mifflin-St Jeor, déficit/superávit, piso e teto das metas, low carb, progresso de peso, MET, datas).
- O código TypeScript foi checado contra versões mínimas dos tipos das bibliotecas: imports, props dos componentes e tipos internos batem.
- O assistente respondeu corretamente às cinco perguntas de exemplo com dados de teste.
- Uma revisão independente procurou erros de build e de fluxo (regras do Next 15, React 19, API do Supabase, Tailwind 4, ícones). Os problemas encontrados foram corrigidos.

**Não** foi possível rodar `npm install`, o build do Next nem abrir as telas no navegador, porque o ambiente onde o código foi escrito bloqueia o download de pacotes. No primeiro `npm run build`, se aparecer algum erro, copie a mensagem e peça a correção.

---

As estimativas de calorias e macros do app são informativas e não substituem acompanhamento de nutricionista ou médico.
