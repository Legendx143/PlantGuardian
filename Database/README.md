# PlantGuardian — Database Layer

The entire persistence layer runs on **Supabase** (PostgreSQL + Auth + Storage + Realtime).

## Architecture

```
┌────────────────────────────────────────────────────┐
│                  Supabase Cloud                     │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  PostgreSQL   │  │   Auth   │  │   Storage    │ │
│  │              │  │          │  │              │ │
│  │ user_profiles │  │ auth.users│  │ plant-images │ │
│  │ (email = PK)  │  │ (hashed  │  │ (private     │ │
│  │              │  │  passwords│  │  per-user)   │ │
│  └──────────────┘  └──────────┘  └──────────────┘ │
│            ▲              │              ▲         │
│            │   trigger    │              │         │
│            └──────────────┘              │         │
│                                          │         │
│  ┌────────────────────────────────────┐  │         │
│  │   Realtime (Postgres Changes)      │  │         │
│  │   → user_profiles publication      │  │         │
│  └────────────────────────────────────┘  │         │
└────────────────────────────────────────────────────┘
         ▲               ▲               ▲
         │               │               │
    Frontend         Backend          Frontend
   (supabase-js)   (service role)   (supabase-js)
```

## Schema: `public.user_profiles`

| Column         | Type         | Constraint                                        |
|----------------|-------------|---------------------------------------------------|
| `email`        | `text`       | **PRIMARY KEY**, forced lowercase via CHECK        |
| `auth_user_id` | `uuid`       | UNIQUE, FK → `auth.users(id)` ON DELETE CASCADE   |
| `created_at`   | `timestamptz`| NOT NULL, DEFAULT `now()`                          |
| `updated_at`   | `timestamptz`| NOT NULL, DEFAULT `now()`                          |

**Email is the primary key** as requested. Passwords are _never_ stored in `user_profiles` — Supabase Auth keeps bcrypt-hashed passwords in its internal `auth.users` table.

## Security

- **Row Level Security (RLS)** is enabled. Each authenticated user can only SELECT their own profile row.
- The auth trigger (`on_auth_user_created_profile`) automatically inserts a `user_profiles` row when a new user registers through Supabase Auth.
- Storage policies restrict each user to their own UUID-named folder inside the `plant-images` bucket.

## Migration

The deployable migration lives at:

```
../supabase/migrations/20261031193000_create_user_profiles.sql
```

### How to apply

**Option A — Supabase Dashboard (recommended for first time):**
1. Go to your Supabase project → **SQL Editor**
2. Paste the contents of the migration file
3. Click **Run**

**Option B — Supabase CLI:**
```bash
npx supabase db push
```

**Option C — Setup script (verification only):**
```bash
cd Database
npm install
npm run setup
```

## Required Supabase Auth Configuration

For registration emails to be sent:

1. Supabase Dashboard → **Auth → Providers → Email**
2. Enable **Confirm email** toggle
3. Set **Site URL** to `http://localhost:5173` (or your production URL)
4. Set **Redirect URLs** to include `http://localhost:5173`
5. For production, configure a custom SMTP provider under **Auth → Email Templates → SMTP Settings**

## Environment Variables

The Database setup script reads from `Database/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> ⚠️ The service role key has **full admin access** — never expose it in the frontend.
