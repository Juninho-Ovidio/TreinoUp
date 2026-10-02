# TreinoUp — app mobile

App mobile (iOS e Android) do **TreinoUp**. Junta num app só o que o site já faz (dieta, água, peso, treinos de academia) com o lado de corrida e rede social, chamado internamente de **TreinoUp Run**: gravar corridas, pedais e trilhas com GPS, segmentos, seguir amigos, clubes e desafios. Usa a mesma identidade visual do site: ouro âmbar sobre grafite, Manrope + Plus Jakarta Sans, dock flutuante.

**Stack:** Expo SDK 57 (React Native 0.86, React 19.2) · TypeScript strict · Expo Router · Zustand + TanStack Query · Supabase (Postgres, Auth, Storage, RLS) · i18next (PT-BR, EN, ES) · Jest + Testing Library.

> **Um banco só.** O app usa o **mesmo projeto Supabase** do site, com login único. As migrations ficam em `supabase/migrations/`, na raiz do repositório. O núcleo compartilhado (perfis) fica no schema `public`. Cada área nova do app ganha o próprio schema: hoje `privacy`; nas próximas fases `run`, `segments`, `social` e `groups`.

---

## 1. Rodar

Pré-requisitos: Node 20+ e conta Expo (grátis). Para testar no celular é preciso um **development build**. O Expo Go não traz os módulos nativos do login da Apple nem, a partir da Fase 1, o GPS em segundo plano e os mapas.

### 1.1 Banco

1. Aplique as migrations novas no projeto Supabase do TreinoUp, como descrito no README da raiz (SQL Editor ou `npx supabase db push`).
2. Em **Authentication → URL Configuration → Redirect URLs**, adicione:
   - `treinoup://**` (app no celular)
   - `exp+treinoup://**` (development build)
   - `http://localhost:8081/**` (versão web do app, para testar no navegador)
3. A partir da Fase 1, em **Project Settings → API → Exposed schemas**, adicione os schemas do app (`privacy`, `run`…). Cada fase avisa quando for preciso.

### 1.2 App

```bash
cd mobile
npm install
cp .env.example .env          # mesma URL e chave pública do site
npx expo start --web          # abre no navegador (o jeito mais rápido de ver as telas)
```

No celular, gere um development build uma vez e depois use `npx expo start`:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile development --platform android   # ou ios
```

Com Android Studio instalado, também dá para rodar local: `npm run android`.

### 1.3 Login social (opcional)

| Provedor | No Supabase | No app |
| --- | --- | --- |
| Google | Authentication → Providers → Google (client ID/secret do Google Cloud, tipo "Web") | `EXPO_PUBLIC_AUTH_GOOGLE=true` |
| Apple | Authentication → Providers → Apple. No iOS o login é nativo: adicione o bundle `com.treinoup.app` em "Client IDs". Fora do iOS usa o fluxo web, que precisa do Services ID e da chave | `EXPO_PUBLIC_AUTH_APPLE=true` |

### 1.4 Gravar uma atividade (Fase 1)

No **celular** (development build), a gravação usa o GPS em segundo plano:
- Na primeira gravação o app pede a localização. Para gravar com a **tela bloqueada**, escolha "Permitir o tempo todo". No Android aparece a notificação fixa "Gravando atividade". Com permissão só "durante o uso", o app avisa e mantém a tela ligada.
- Tudo é salvo no **SQLite do aparelho** a cada ponto: funciona sem internet, e se o app fechar, a gravação continua de onde parou ao reabrir.
- O mapa usa **MapLibre** com os estilos gratuitos do **OpenFreeMap** (troque em `EXPO_PUBLIC_MAP_STYLE_LIGHT/DARK`).

No **navegador** (`npx expo start --web`) dá para testar o fluxo inteiro, mas só com a aba aberta e a tela ligada. As gravações ficam no `localStorage`, e o worker do mapa web é copiado para `public/maplibre/` no `npm install`.

O que entra na gravação:
- **Filtro de GPS:** descarta pontos com precisão pior que 30 m e saltos impossíveis para o esporte, e suaviza a posição com um filtro de Kalman.
- **Elevação:** média móvel com histerese de 3 m.
- **Parciais:** por km, ou por milha se o perfil estiver em milhas.
- **Pausa automática:**
  - corrida: acelerômetro + GPS;
  - bike: velocidade do GPS.
- **Avisos de voz:** a cada parcial e ao pausar ou retomar.
- **Tela sempre ligada:** opcional.
- **Botões:** volta e "segurar para finalizar".
- **Resumo:** título automático ("Corrida da manhã"), esforço percebido de 1 a 10 e visibilidade.

As atividades ficam **salvas no aparelho** e aparecem em Run → Você como "Aguardando envio". O envio ao servidor é a Fase 2. O id de cada gravação já é o `client_activity_id` que vai evitar duplicatas.

### 1.5 Comandos

| Comando | O que faz |
| --- | --- |
| `npm start` / `npm run web` | Servidor de desenvolvimento |
| `npm test` / `npm run test:coverage` | Testes do app (Jest), com cobertura mínima de 70% no domínio |
| `npm run typecheck` / `npm run lint` | TypeScript e ESLint |
| `npm run icons` | Regera ícone, splash e favicon a partir de `assets/brand/treinoup-mark.svg` |
| `npm run doctor` | Diagnóstico do Expo |
| `npm run test:db` (na **raiz**) | Aplica todas as migrations (site + app) num Postgres em WASM (PGlite) e testa RLS, regras e triggers |

O CI (`.github/workflows/mobile.yml`) roda tudo isso a cada push que mexe em `mobile/` ou `supabase/`.

---

## 2. Estrutura

```
mobile/
├─ src/
│  ├─ app/                    rotas (Expo Router)
│  │  ├─ _layout.tsx          providers + "portão": sem sessão → login do TreinoUp
│  │  ├─ (auth)/              boas-vindas, login, cadastro, recuperar senha (do TreinoUp)
│  │  ├─ auth/callback.tsx    retorno de links de e-mail e do login social
│  │  ├─ reset-password.tsx
│  │  └─ (app)/
│  │     ├─ index.tsx         tela inicial do TreinoUp (resumo do dia + botão do Run)
│  │     ├─ settings, edit-profile
│  │     └─ run/              TreinoUp Run (/run)
│  │        ├─ onboarding.tsx primeira entrada: @usuário, nome e unidades
│  │        ├─ (tabs)/        as 5 abas do Run, no dock do TreinoUp
│  │        └─ search, notifications
│  ├─ features/record/        gravação: domain (máquina de estados, filtros, parciais), engine (motor + fila),
│  │                          data (SQLite / localStorage), services (GPS, acelerômetro, voz), presentation
│  ├─ features/<feature>/
│  │  ├─ domain/              regras puras e testadas (validação, gate, username…)
│  │  ├─ data/                acesso ao Supabase (cada feature fala com o seu schema)
│  │  └─ presentation/        hooks e componentes da feature
│  ├─ design-system/          tokens (cores, tipografia, espaçamento), tema claro/escuro, componentes
│  ├─ i18n/                   pt-BR (fonte), en, es — chaves tipadas
│  └─ lib/                    cliente Supabase, env, storage seguro, preferências
├─ assets/                    ícones e splash (gerados de assets/brand/treinoup-mark.svg)
└─ scripts/                   geração de ícones

supabase/ (raiz)              migrations e testes do banco único
```

---

## 3. Decisões

- **Banco único, separado por schema.** Login e perfil são os mesmos do site. As tabelas do site continuam em `public`, e as do app entram em schemas próprios, cada um com a sua RLS. A migration do app só **acrescenta** colunas ao perfil (`username`, `bio`, `city`, `profile_visibility`) e usa um trigger próprio no cadastro, sem alterar o do site. Um teste roda as migrations do site, cria um usuário "antigo" e só depois aplica as do app, para garantir que nada existente quebra.
- **Login é do TreinoUp; o Run é uma área.** O app abre como TreinoUp (boas-vindas, login, cadastro, tela inicial). O TreinoUp Run se abre pelo botão da tela inicial, sem novo login. Na primeira entrada ele pede o `@usuário`. O `onboarded_at` do perfil continua sendo o da dieta (site).
- **Tela inicial com dados reais.** O resumo do dia (calorias, macros, água, exercício) lê as mesmas tabelas do diário do site e usa as mesmas regras de cálculo.
- **Mesma identidade do TreinoUp, com ajuste de acessibilidade.** No tema claro, o texto sobre o dourado é grafite (branco dava 2,2:1) e os links usam âmbar escuro `#8F5606` (5,7:1). Um teste confere o contraste AA de todos os pares de texto nos dois temas.
- **Privacidade no servidor.** Cada usuário só lê o próprio perfil. O `@usuário` é consultado pela função `username_available` sem expor perfis. Padrões seguros: perfil, atividades e mapa começam em "Seguidores"; flyby e mapa de calor começam desligados.
- **Regras iguais no app e no banco.** O formato e os nomes reservados do `username` existem no TypeScript e numa `check constraint`; um teste lê a migration e compara.
- **Sessão no Keychain/Keystore.** O token fica no SecureStore, dividido em pedaços, porque o SecureStore recomenda até 2 KB por valor. Login social usa PKCE.
- **Excluir conta (LGPD).** O app apaga as fotos pelo Storage e chama a mesma `delete_my_account()` do site, que remove tudo em cascata.

### Caminho de evolução do backend

O MVP fica no Supabase (Postgres + PostGIS + Edge Functions + `pg_cron`). Quando o volume pedir:
1. Fila dedicada para o processamento pós-upload (casamento de segmentos, recordes, notificações), no lugar do `pg_cron`.
2. Séries temporais (GPS, FC, potência) em armazenamento próprio e compactado.
3. Feed com fan-out na escrita para quem tem muitos seguidores.
4. Serviços separados (ingestão, segmentos, feed) com mensageria (ex.: Kafka), só quando o Postgres único virar gargalo.

---

## 4. Roadmap

| Fase | Entrega | Status |
| --- | --- | --- |
| 0. Fundação | Repositório, CI, design system, 5 abas, login (e-mail, Google, Apple), perfil | ✅ |
| 1. Gravação | GPS offline-first, tela de gravar, pausa automática, resumo, salvar local | ✅ |
| 2. Atividades | Upload, detalhe com mapa, gráficos, parciais, histórico, estatísticas | |
| 3. Social | Seguir, feed, curtidas, comentários, push | |
| 4. Privacidade | Todos os controles, zonas de privacidade no servidor | |
| 5. Segmentos e mapas | Criar/casar segmentos, rankings, rotas, heatmap | |
| 6. Grupos | Clubes, desafios, medalhas | |
| 7. Premium e polimento | Assinatura, segmentos ao vivo, beacon, retrospectiva, lojas | |
| — Dieta e treinos no app | Levar Diário, Treinos e Progresso do site para o app (reaproveitando `src/lib`) | a planejar |
