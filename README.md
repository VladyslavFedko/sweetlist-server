# SweetList backend

REST API for **SweetList** – a recipe manager and shopping list for confectioners (design: Figma "Products-manager").

**Stack:** Node.js · TypeScript · Express 5 · Sequelize 6 + PostgreSQL · Zod · JWT · multer

## Quick start

```bash
cp .env.example .env          # set JWT_SECRET
docker compose up -d          # PostgreSQL on :5432 (or use your own and edit DATABASE_URL)
npm install
npm run db:sync               # create tables from the models
npm run db:seed               # optional demo data from the design
npm run dev                   # http://localhost:5000
```

Demo accounts after seeding (password `password123`): `olena@example.com` (Premium), `maria@example.com`.

## Architecture

```
src/
  config/       env (validated with Zod), Sequelize instance
  models/       User, Recipe, Ingredient, RecipeStep, Tag, RecipeShare, ShoppingList(+Recipe,+Item), associations in index.ts
  validators/   Zod schemas for body / query / params
  middleware/   auth (JWT, Premium), validate, upload (multer), error handler
  services/     business logic: recipe access rules + queries, shopping list aggregation
  controllers/  thin HTTP handlers, one per entity
  routes/       routing, validators and middleware wiring
  scripts/      sync.ts, seed.ts
```

Validation: Sequelize validators guard the DB layer, Zod validates every request (types, ranges, coercion, defaults).
Errors always look like `{ "error": { "code", "message", "details?" } }`; lists are `{ "data": [...], "meta": { page, limit, total, totalPages } }`.

## Domain (derived from the design)

| Entity | Notes |
|---|---|
| User | profile, language `uk/en`, theme, cloud-sync flag, `premiumUntil` |
| Recipe | title, description, photo, prep/rest time, servings (+ `portions`/`pieces`), tags, `storageMode`, `isPublished`, public `shareToken` |
| Ingredient | name, quantity, unit, **category** (`dairy/dry/eggs/other` – used to group the shopping list), position |
| RecipeStep | ordered, title + instruction |
| Tag | shared, case-insensitive unique |
| RecipeShare | recipe shared with a user (email or `@username`); read-only for recipient |
| ShoppingList | one per user; recipes with chosen servings; per-product "bought" flag and manual quantity |

Rules: only the author edits/deletes a recipe; recipients and Premium catalog readers get read-only access;
publishing to the catalog and browsing it require Premium; the same product in several recipes is summed in the product view and its "bought" flag is shared.

## Endpoints (`/api`, JWT in `Authorization: Bearer <token>` unless noted)

**Auth** – `POST /auth/register`, `POST /auth/login`

**Users** – `GET|PATCH|DELETE /users/me`, `PUT /users/me/password`, `POST|DELETE /users/me/avatar` (field `avatar`, JPG/PNG ≤ 5 MB), `POST|DELETE /users/me/premium` (mocked payment)

**Recipes**
- `GET /recipes?scope=mine|received|catalog&q=&tag=&sort=newest|oldest|title|time&page=&limit=`
- `POST /recipes` (with `ingredients[]`, `steps[]`, `tags[]`), `GET|PATCH|DELETE /recipes/:id`
- `POST|DELETE /recipes/:id/photo` (field `photo`, JPG/PNG ≤ 10 MB)
- `POST|DELETE /recipes/:id/share-link` and public `GET /shared/:token` (no auth)
- `GET|POST /recipes/:recipeId/ingredients`, `GET|PATCH|DELETE .../ingredients/:ingredientId`
- `GET|POST /recipes/:recipeId/steps`, `PUT .../steps/order`, `GET|PATCH|DELETE .../steps/:stepId`
- `GET|POST /recipes/:recipeId/shares`, `DELETE .../shares/:userId` (owner), `DELETE .../shares/me` (recipient)

**Tags** – `GET|POST /tags`, `GET|PATCH|DELETE /tags/:id`

**Shopping list**
- `GET /shopping-list?view=all|recipes|products`
- `POST /shopping-list/recipes`, `PATCH|DELETE /shopping-list/recipes/:recipeId`
- `PUT /shopping-list/items` (bought flag / manual quantity), `POST /shopping-list/confirm`, `DELETE /shopping-list`

## Not included yet

- Google / Facebook / Apple sign-in buttons from the login screen (needs OAuth app credentials)
- Real payments for Premium, e-mail notifications for shared recipes
- Migrations (the schema is created with `sequelize.sync`; switch to Umzug / `sequelize-cli` before production)
- Offline/"local" storage mode is a client concern; the API only stores the `storageMode` flag
