# PlantGuardian backend

This service validates Supabase user sessions for future protected API routes.
It deliberately does not accept or store user passwords: the frontend sends credentials directly to Supabase Auth over HTTPS.

1. Copy `.env.example` to `.env` and set the server-only service-role key.
2. Run `npm install`.
3. Run `npm run dev`.

Do not put `SUPABASE_SERVICE_ROLE_KEY` in the frontend.

For the registration confirmation email, enable **Confirm email** in Supabase Auth's Email provider and configure the site's redirect URL to your frontend origin. Use an SMTP provider before production.
