# Ops Log — Elevations Intake

Small internal app: pick a Project → pick a Building → type in elevation
names → creates the rows in Elevations DB, flips `Ops Log Created` on the
Building, and flips it on the Project once every Building under it is done.

No login. Captures a name/email per submission (`Submitted By` /
`Submitter Email` on each Elevations row).

## 1. Create a new Notion integration (separate from the Timesheet app)

1. Go to https://www.notion.so/my-integrations → **New integration**.
2. Name it something like `Ops Log App`. Internal integration, no special
   capabilities needed beyond default read/insert/update content.
3. Copy the **Internal Integration Token** — this is `NOTION_TOKEN`.
4. Share the integration with exactly three databases (open each one in
   Notion → `•••` → **Connections** → add the integration):
   - Project DB
   - Buildings DB
   - Elevations DB

## 2. Get the data source IDs

For each of the three databases, you need the **data source ID** (not the
page ID). The easiest way: open the database as a full page in your
browser and look at the URL, or ask Claude to fetch the database and read
off the `collection://...` id from the schema. The three you need are
already filled in as defaults in `.env.local.example` for this workspace —
double check they still match if the schema changes.

## 3. Local setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local with your real token
npm run dev
```

Visit http://localhost:3000

## 4. Deploy to Vercel

```bash
npm i -g vercel   # if you don't have it
vercel
```

Follow the prompts (new project, don't link to an existing one). Then add
the three environment variables from `.env.local` in the Vercel project's
**Settings → Environment Variables**, and redeploy.

## Notes on how it behaves

- **Elevation Code** (the title on each Elevations row) is left blank by
  this app on purpose — your existing Notion automation (triggered on
  "Page added", watching `Building Name` / `Elevation Name`) fills it in
  right after.
- **Elevation Name** suggestions come from the Select property's existing
  options. Typing something new just becomes a new option automatically
  when the row is created — no extra step needed.
- If a Building's elevations were submitted incomplete, the only way to
  redo it right now is to manually uncheck `Ops Log Created` on that
  Building in Notion — it'll reappear in the app immediately since the
  building list is always fetched live.
- Same logic applies at the Project level if it was marked complete too
  early — uncheck `Ops Log Created` on the Project to make it reappear in
  the project dropdown.
