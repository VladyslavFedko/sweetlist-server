# API tests (VS Code REST Client)

1. Install the recommended extensions (`.vscode/extensions.json`).
2. `npm run db:seed` once, then `npm run dev`.
3. Open a file and click **Send Request** above any request. No environment setup is needed: every file defines its own `@baseUrl` and uses the seeded accounts directly.

Each file is self-contained: it logs in first and creates what it needs, so you can run files in any order.
Requests inside a file are meant to be run top to bottom. The seed users are
`olena@example.com` (Premium) and `maria@example.com`, both with `password123`.
If your Postgres runs on another port, change it in `.vscode/settings.json` (`sqltools.connections`).
