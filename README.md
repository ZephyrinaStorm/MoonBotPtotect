# GuardBot Pro — Render Web + Discord Bot

A standalone **GitHub-ready starter** containing one Node.js process hosting both a Discord bot and a public informational website.

> IMPORTANT: This package was created independently because the referenced GitHub repository could not be cloned from this environment. It is **not** a verified modification of the existing GuardBot-Pro source. Merge manually or replace only after reviewing differences.

## Commands

There are **100 executable slash subcommands**, grouped into 10 top-level Discord commands (Discord slash commands have nesting limits). `/moderation ban`, `/blacklist add`, etc. The complete catalog is in `src/commands.js` and on the website.

## Deploy

1. Upload all ZIP contents to a GitHub repository (do not upload your `.env`).
2. Create a Render Blueprint from the repository using `render.yaml`.
3. Configure `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and optionally `DISCORD_GUILD_ID` (recommended for fast testing). Set `PUBLIC_URL` to the Render site URL.
4. Enable **Server Members Intent** in the Discord Developer Portal. Invite bot with applications.commands and the permissions needed for moderation, channel management, role management, and viewing audit logs.
5. Render deploys a single paid Starter web service with a persistent disk at `/var/data` (adjust plan/disk according to your Render account). Website is served from `/`; `/health` is the health endpoint.
6. Commands register automatically at bot startup. For manual registration: `npm run register`.

## Local run

`cp .env.example .env && npm install && npm start`

## Implemented vs limited

- Working: Discord login, command registration, ban/unban/kick/timeout/warnings/purge/slowmode, blacklist enforcement, unauthorized bot kicks when enabled, new-account flagging, join-burst alerts, destructive audit-event alerts, backup snapshots, persistent settings, logs, public command directory and status API.
- Limited: backup restore is deliberately disabled; anti-nuke is alert-only; anti-alt is flag-for-review, not automatic proof of alternate accounts; no age document collection; no OAuth administrative dashboard; no automatic timed backup scheduling. Several configuration and review commands store settings or return informational status rather than implementing complex enforcement. Review before production deployment.
- Data storage: JSON on a persistent disk; for larger multi-server deployment, use Postgres with migrations and transactional writes.
- Protect the Discord bot token and set role hierarchy correctly. Restrict dangerous permissions; the example invite permission bitmask should be reviewed and adjusted.

## Security

The public site exposes only aggregate statistics and command names. All moderation slash commands require Manage Server permission, but Discord role hierarchy and bot permissions still apply. Do not treat this as a fully audited security product.
