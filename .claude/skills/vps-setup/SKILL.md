---
name: vps-setup
description: Use when setting up, verifying, or re-running the Robin production VPS (Hostinger KVM2, Ubuntu 24.04 + Docker) — provisioning, hardening, deploy no git push, nginx/SSL
---

# Robin VPS Setup

Setup completo da VPS de produção. Spec: `docs/superpowers/specs/2026-07-16-vps-setup-design.md`.
Cada passo tem verificação — não avance sem ela passar. Todos os passos são idempotentes.

## Fatos fixos

| | |
|---|---|
| VM | Hostinger id 1835183, KVM2 (2 vCPU / 8GB / 100GB), Campinas (DC 22) |
| IP | 179.197.226.79 |
| Domínio | api.robinzip.app (A → IP, TTL 300, zona na Hostinger) |
| OS | Ubuntu 24.04 + Docker (template 1121) |
| Chave SSH | `~/.ssh/robin_vps` (local do Gustavo) |
| Usuário deploy | `robin` (sem sudo, grupo docker) |
| Layout | `/opt/robin/{repo.git,app,shared/.env}` |

## 1. Provisionar (só se a VM estiver `state: initial`)

Via MCP `hostinger-vps` ou API: `VPS_setupPurchasedVirtualMachineV1` com
`template_id: 1121, data_center_id: 22, hostname: api.robinzip.app, public_key: robin_vps.pub`.

**Verificar:** `VPS_getVirtualMachineDetailsV1` → `state: running`.

## 2. Primeiro acesso + usuário

```bash
ssh -i ~/.ssh/robin_vps root@179.197.226.79

adduser --disabled-password --gecos "" robin
usermod -aG docker robin
mkdir -p /home/robin/.ssh
cp /root/.ssh/authorized_keys /home/robin/.ssh/
chown -R robin:robin /home/robin/.ssh && chmod 700 /home/robin/.ssh && chmod 600 /home/robin/.ssh/authorized_keys
```

**Verificar:** `ssh -i ~/.ssh/robin_vps robin@179.197.226.79 docker ps` funciona.

## 3. Hardening SSH + firewall (como root)

```bash
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart ssh

ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
```

**Verificar:** `ufw status` mostra só 22/80/443; login por senha recusado.
**Atenção:** não fechar a sessão atual antes de confirmar que a chave entra.

## 4. Estrutura + bare repo (como robin)

```bash
sudo mkdir -p /opt/robin/{app,shared} && sudo chown -R robin:robin /opt/robin
git init --bare /opt/robin/repo.git
# copiar deploy/post-receive do repo para /opt/robin/repo.git/hooks/post-receive
chmod +x /opt/robin/repo.git/hooks/post-receive
```

**Verificar:** `ls /opt/robin` → `app repo.git shared`; hook executável.

## 5. Segredos

```bash
# local: scp deploy/.env.example robin@179.197.226.79:/opt/robin/shared/.env
# na VPS: preencher os valores reais, depois:
chmod 600 /opt/robin/shared/.env
```

Pré-requisito externo: Mongo Atlas M0 criado com `179.197.226.79` na allowlist.

**Verificar:** `stat -c "%a %U" /opt/robin/shared/.env` → `600 robin`; nenhuma var vazia:
`grep -c '=$' /opt/robin/shared/.env` → `0`.

## 6. Nginx + SSL (como root)

```bash
apt-get update && apt-get install -y nginx certbot python3-certbot-nginx
# copiar deploy/nginx/robin.conf para /etc/nginx/sites-available/robin.conf
ln -sf /etc/nginx/sites-available/robin.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d api.robinzip.app --non-interactive --agree-tos -m gustavonobg@gmail.com
```

Pré-requisito: DNS `api.robinzip.app` propagado (`dig +short api.robinzip.app` → IP).
`.app` exige HTTPS (HSTS na TLD) — sem certbot o browser recusa.

**Verificar:** `curl -sI https://api.robinzip.app` responde (502 é ok antes do deploy);
`certbot renew --dry-run` passa.

## 7. Primeiro deploy (local)

```bash
git remote add vps robin@179.197.226.79:/opt/robin/repo.git   # uma vez
git push vps main
```

**Verificar (na VPS):** `docker compose -f /opt/robin/app/deploy/docker-compose.yml ps`
→ api/worker/redis `running`, api `healthy`.

## 8. Verificação final

- [ ] `curl -s https://api.robinzip.app/health` → 200
- [ ] Job de compressão fim-a-fim: upload → fila → worker → R2
- [ ] `ufw status` → só 22/80/443
- [ ] `ssh root@IP` com senha → recusado
- [ ] `docker compose ps` → 3 serviços up, restart `unless-stopped`

## Operação

| Ação | Comando |
|---|---|
| Deploy | `git push vps main` (local) |
| Logs | `docker compose -f /opt/robin/app/deploy/docker-compose.yml logs -f api` |
| Restart | `docker compose -f /opt/robin/app/deploy/docker-compose.yml restart api` |
| Métricas da VM | MCP `hostinger-vps` → `VPS_getMetricsV1` |
| Tuning workers | editar `*_WORKER_CONCURRENCY` em `/opt/robin/shared/.env` + restart worker |

Fora de escopo (decisão de MVP, spec §Escopo): rollback, zero-downtime, alerting, CI, fail2ban.
