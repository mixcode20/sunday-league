# WhatsApp Footy

Minimal web app for a weekly 7-a-side WhatsApp group. No user accounts. Players join a gameweek by picking their name from a dropdown. Organiser actions are protected by a PIN prompt and enforced server-side.

## Setup

1) Install dependencies
```bash
npm install
```

2) Create a Supabase project and open the SQL editor

Paste the contents of `supabase/schema.sql` to create tables, constraints, and indexes.

3) Insert your players

Example:
```sql
insert into players (first_name, last_name)
values
  ('Sam', 'Nguyen'),
  ('Alex', 'Smith'),
  ('Jamie', 'Lee');
```

4) Add environment variables

Create `.env.local` with:
```
SUPABASE_URL=your-supabase-url
SUPABASE_SECRET_KEY=your-service-role-key
ORGANISER_PIN=your-pin
```

## Run locally

```bash
npm run dev
```

Open http://localhost:3000

## Deploy

1) Deploy the Next.js app to your host (Vercel, Netlify, Render, etc.)
2) Add the same environment variables in your host’s settings:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `ORGANISER_PIN`
3) Build and start:
```bash
npm run build
npm run start
```

## Production verification

- Debug endpoint: `GET /api/debug/env` returns the Supabase URL host and whether publishable/secret keys are set (no secrets).
- Verify tables are empty: open Supabase and confirm `gameweeks`, `gameweek_players`, and `players` have zero rows.
- Expected empty states:
  - `/` shows “No open gameweek yet. Unlock organiser mode to create one.”
  - `/` shows “No players yet. Use “+ New player” to add the first name.” when no players exist.
  - `/teams` shows “No open gameweek yet. Unlock organiser mode to create one.”

## Slot claim verification checklist

Issue reproduction

1) Create a new gameweek (organiser mode).
2) Player mode: click an empty slot, select a player, and save.
3) Previously the name flashed then disappeared with “Failed to claim slot.”

Check server logs

- Watch the Next.js server console for `[join-flow] claim error` logs.

Debug endpoint

```bash
curl "http://localhost:3000/api/debug/slot-claim-check?gameweekId=YOUR_GAMEWEEK_ID&playerId=YOUR_PLAYER_ID&position=1"
```

Expected success behavior

- Selecting a player for a slot persists a row in `gameweek_players`.
- The name remains visible for all users after refresh.
- If an error occurs, the UI displays the specific API error message (not a generic failure).

## Notes

- Only one open gameweek is allowed at a time (enforced by DB index).
- Organiser writes always go through server route handlers with PIN validation.
- The Supabase service role key never touches the client.
