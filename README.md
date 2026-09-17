# ELO-everything

通用 Elo 天梯 Web 应用：1v1 / 2v2 / NvN 记分 + 局内科学配对（CSP，默认 `fair` preset）。

设计文档：[docs/design.md](docs/design.md)（v0.3.1）

## 仓库结构

| 路径 | 说明 |
|------|------|
| `packages/rating-engine` | 纯函数 Elo 引擎（equal full-Δ team、strict/soft、quantize4） |
| `packages/pairing-engine` | 约束随机配对 CSP（硬规则 + cost + 温度采样） |
| `packages/db` | Drizzle schema + SQL migrations |
| `apps/api` | NestJS REST API（`/api/v1`） |
| `apps/web` | Next.js 控制台 UI |

## 快速开始

```bash
# 依赖
pnpm install
# 若 pnpm 因 ignored build scripts 报错，可直接用包内二进制跑测试（见下）

# 数据库（默认映射宿主机 54329，避免与本机 5432 冲突）
docker compose up -d
export DATABASE_URL=postgresql://elo:elo@localhost:54329/elo_everything
cp -n .env.example .env   # 已含 54329

# 迁移
cd packages/db && npx tsx src/migrate.ts && cd ../..

# 测试（引擎）
cd packages/rating-engine && ./node_modules/.bin/vitest run
cd ../pairing-engine && ./node_modules/.bin/vitest run

# API
cd apps/api
DATABASE_URL=postgresql://elo:elo@localhost:54329/elo_everything npx tsx src/main.ts
# → http://localhost:3001/api/v1

# Web（另一终端）
cd apps/web && npx next dev -p 3100
# → http://localhost:3100
```

## 已实现能力（MVP）

- 注册 / 登录（HTTP-only session cookie；暂非 Better Auth，语义兼容后续替换）
- Workspace + Ladder（config preset：`chess_like` 等）
- 比赛记分 + preview + void（void 后 full ladder replay）
- Leaderboard
- 配对 session：`fair` 默认 → generate → confirm drafts
- 引擎单测：1v1 / 2v2 Appendix A / zero-sum / provisional K / hash

## 主要 API

| Method | Path |
|--------|------|
| POST | `/api/v1/auth/register` `/login` `/logout` |
| GET | `/api/v1/auth/me` |
| POST/GET | `/api/v1/workspaces` |
| POST/GET | `/api/v1/workspaces/:ws/ladders` |
| GET/PATCH | `/api/v1/ladders/:id` `/config` |
| POST | `/api/v1/ladders/:id/matches` `/matches/preview` |
| POST | `/api/v1/matches/:id/void` |
| POST | `/api/v1/ladders/:id/rebuild` |
| GET | `/api/v1/ladders/:id/leaderboard` |
| POST | `/api/v1/ladders/:id/pairing-sessions` |
| POST | `/api/v1/pairing-sessions/:id/generate` |
| POST | `/api/v1/pairing-sessions/:id/proposals/:pid/confirm` |

## 下一步（按设计 PR Plan）

- Idempotency-Key、correct API、尾部廉价 void
- Metadata tags/notes 完整 API
- Better Auth 替换会话
- Web：规则编辑器、风险色标、移动端记分打磨
- 大规模分桶配对（§4A.9）

## 生产部署（Debian VPS）

目标机：context-osv6 主站 Debian（`VPS_MAIN_*`，见 `context-osv6/avrag-rs/.env`）。

```bash
# 本机执行（会 rsync → /opt/elo-everything，起 PG/API/Web + nginx）
bash deploy/deploy.sh
```

| 项 | 值 |
|----|-----|
| 目录 | `/opt/elo-everything` |
| 域名 | `https://elo.contextlm.top`（nginx + 通配证书） |
| Web | `127.0.0.1:3110` · systemd `elo-web` |
| API | `127.0.0.1:3011` · systemd `elo-api` |
| Postgres | Docker `elo-postgres` · `127.0.0.1:54330` |

DNS：把 `elo.contextlm.top` 指到主站 IP（或 Cloudflare 橙云代理，与其它 `*.contextlm.top` 一致）。

## 许可

Private / TBD
