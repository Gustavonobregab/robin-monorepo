# VPS Setup — Robin Wood (MVP)

Data: 2026-07-16
Alvo: Hostinger KVM2 (VM 1835183), Ubuntu 24.04 + Docker (template 1121), Campinas (DC 22).
Escopo: api Elysia/Bun + worker BullMQ + Redis atrás de Nginx/SSL, deploy no git push.
Fora de escopo (decisão explícita): rollback, zero-downtime, alerting, CI, fail2ban.

## Layout na VPS

```
/opt/robin/
├── repo.git/              # bare repo — alvo do git push
│   └── hooks/post-receive # checkout + docker compose up -d --build
├── app/                   # working tree (checkout feito pelo hook; nunca editar à mão)
└── shared/
    └── .env               # segredos, chmod 600, dono robin:robin — NUNCA no git
```

- Usuário de deploy: `robin` (sem sudo, dono de `/opt/robin`, membro do grupo `docker`).
- SSH: só chave (`robin_vps`), `PasswordAuthentication no`, root login desabilitado.
- UFW: allow 22/80/443, deny resto. Docker publica portas só em `127.0.0.1`.

## Layout no repo

```
deploy/
├── Dockerfile             # base oven/bun (glibc → sharp ok); imagem única api+worker
├── docker-compose.yml     # api, worker, redis
├── nginx/robin.conf       # server block; instalado em /etc/nginx/sites-available/
├── post-receive           # fonte do hook (instalado pela skill em repo.git/hooks/)
└── .env.example           # todas as vars, valores fake, comentadas por grupo
.claude/skills/vps-setup/
└── SKILL.md               # checklist reexecutável do setup completo
```

## Containers (docker-compose.yml)

| serviço | comando | portas | limites |
|---|---|---|---|
| api | `bun run src/server.ts` | `127.0.0.1:3000:3000` | — |
| worker | `bun run src/worker/index.ts` | nenhuma | `mem_limit: 3g` |
| redis | `redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy noeviction` | só rede interna | volume `redis-data` |

- Todos `restart: unless-stopped`, logs `json-file` com `max-size: 10m, max-file: 3`.
- Healthcheck da api: `GET /health` (módulo existente). Worker sem healthcheck HTTP (processo BullMQ); `restart` cobre crash.
- `env_file: /opt/robin/shared/.env` nos serviços api e worker.
- Rede interna `robin-net`; redis não é publicado no host.
- `noeviction` no redis: BullMQ perde job com eviction; preferimos erro visível a perda silenciosa.

## Env vars (21) — `.env.example` agrupado

```
# --- Runtime ---
NODE_ENV=production
CLIENT_URL=            # URL do dashboard na Vercel
API_RATE_LIMIT_PER_MINUTE=60

# --- Infra (definidas pelo setup, não são segredo) ---
MONGODB_URI=           # Atlas M0 — criar à parte, IP da VPS na allowlist
REDIS_URL=redis://redis:6379

# --- Workers (tuning p/ 2 vCPU; medir e ajustar) ---
AUDIO_WORKER_CONCURRENCY=1
IMAGE_WORKER_CONCURRENCY=2
TEXT_WORKER_CONCURRENCY=2

# --- Auth ---
BETTER_AUTH_SECRET=    # gerar: openssl rand -base64 32
BETTER_AUTH_URL=       # https://<dominio-api>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# --- Billing ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ABACATEPAY_API_KEY=
ABACATEPAY_BASE_URL=https://api.abacatepay.com
ABACATEPAY_WEBHOOK_SECRET=

# --- Storage (Cloudflare R2) ---
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
```

## Nginx + SSL

- Server block em `deploy/nginx/robin.conf`: proxy pra `127.0.0.1:3000`, `client_max_body_size 100m` (upload de áudio), timeouts de proxy 300s (jobs síncronos não existem, mas upload grande sim).
- SSL via certbot (`--nginx`), renovação automática pelo timer do systemd.
- Domínio: placeholder `DOMAIN` na skill — definido na execução (DNS pode ser gerenciado pelo MCP hostinger-dns se o domínio estiver na Hostinger).

## Deploy (git push)

1. Local: `git remote add vps robin@<IP>:/opt/robin/repo.git`
2. `git push vps main` → hook `post-receive`:
   - `git --work-tree=/opt/robin/app --git-dir=/opt/robin/repo.git checkout -f main`
   - `docker compose -f /opt/robin/app/deploy/docker-compose.yml up -d --build`
3. Downtime ~10s por deploy (aceito no escopo MVP).

## Skill (.claude/skills/vps-setup/SKILL.md)

Checklist reexecutável, cada passo com comando + verificação:

1. Provisionar VM via API Hostinger (setup: template 1121, DC 22, hostname robin-api, chave robin_vps) — só se `state: initial`.
2. Primeiro acesso: criar usuário `robin`, hardening SSH, UFW.
3. Estrutura `/opt/robin` + bare repo + hook.
4. `.env` a partir do `.env.example` (preenchimento manual, chmod 600).
5. Nginx + certbot (requer DNS apontado antes).
6. Primeiro deploy + verificação: `curl https://DOMAIN/health`, `docker compose ps`, job de teste na fila.

## Verificação final

- `curl https://DOMAIN/health` → 200
- `docker compose ps` → 3 serviços `running`, api `healthy`
- Job de compressão de teste completa fim-a-fim (upload → fila → worker → R2)
- `ufw status` → só 22/80/443
- `ssh root@IP` com senha → recusado
