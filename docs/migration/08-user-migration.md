## User Migration (Cognito → Supabase) – Pre-provision + Forced Reset

### Goals

- Migrate Cognito users so that:
  - Users can sign in to Supabase with the same email (password reset required).
  - `public.users.id` equals `auth.users.id`.
  - Preserve authorship:
    - `projects.created_by` = from `OmtTranslations.userId` (Cognito sub → mapped Supabase user id)
    - `audio_versions.created_by` = same as project
    - `media_files.created_by` = from `OmtAudioFiles.userId` (per-file uploader)

### Core Constraints

- Cognito does not expose password hashes → cannot migrate passwords directly.
- Supabase Auth Admin API creates `auth.users` and returns an auto-generated UUID; you cannot set `auth.users.id` manually.
- `public.users.id` must match `auth.users.id` → create `auth.users` first, then insert `public.users` with that returned UUID.

### Mapping Tables

```sql
CREATE TABLE IF NOT EXISTS migration_cognito_users (
  cognito_sub TEXT PRIMARY KEY,
  supabase_user_id UUID NOT NULL
);
```

- Also keep a raw extract table or CSV with: `sub, email, email_verified, phone, name, given_name, family_name, created_at`.

### Migration Order (per environment)

1. Export Cognito users (email + sub + profile fields, no passwords).
2. For each user:
   - Create Supabase user via Admin API with email (mark email_confirmed = true, set a random temp password).
   - Capture returned `auth.users.id` → insert row in `migration_cognito_users` (sub → id).
   - Insert into `public.users` using the same id:
     ```sql
     INSERT INTO public.users (id, email, name, created_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO NOTHING;
     ```
3. Authorship backfill using mappings:
   - `projects.created_by`: set via `OmtTranslations.userId` (Cognito sub) → `migration_cognito_users.supabase_user_id`.
   - `audio_versions.created_by`: same as parent project.created_by.
   - `media_files.created_by`: set via `OmtAudioFiles.userId` (Cognito sub) → `migration_cognito_users.supabase_user_id`.
4. Issue password reset emails:
   - Generate Supabase recovery links or trigger password reset emails for each user.
   - Optionally, defer until first login attempt (UI prompts for reset).

### Supabase Admin API (sketch)

- Create user:
  - Endpoint: `POST /auth/v1/admin/users`
  - Body:
    ```json
    {
      "email": "user@example.com",
      "email_confirm": true,
      "password": "<random-temp>",
      "user_metadata": { "source": "cognito" }
    }
    ```
  - Response includes `id` (UUID) → use for `public.users.id` and mapping table.

### Setting created_by fields

- Projects (from translations):
  ```sql
  UPDATE projects p
  SET created_by = m.supabase_user_id
  FROM migration_omt_translations mt
  JOIN migration_cognito_users m ON m.cognito_sub = <translations.userId>
  WHERE p.id = mt.project_id
    AND p.created_by IS DISTINCT FROM m.supabase_user_id;
  ```
- Audio versions:
  ```sql
  UPDATE audio_versions av
  SET created_by = p.created_by
  FROM projects p
  WHERE av.project_id = p.id
    AND av.created_by IS DISTINCT FROM p.created_by;
  ```
- Media files (from OMT audio files):
  ```sql
  UPDATE media_files mf
  SET created_by = m.supabase_user_id
  FROM migration_omt_audio_to_media mam
  JOIN migration_cognito_users m ON m.cognito_sub = <audioFiles.userId>
  WHERE mf.id = mam.media_file_id
    AND mf.created_by IS DISTINCT FROM m.supabase_user_id;
  ```

### Forced Password Reset

- Options:
  - Bulk send recovery emails after provisioning.
  - On login, if Supabase rejects password, show a “Reset password” prompt.
- Recommended: send a rollout email campaign with recovery links.

### Edge Cases

- Duplicate emails across Cognito pools → decide merge rules (prefer prod? newest?).
- Users without verified email → set `email_confirm=false` and require email verification.
- Missing `userId` on content rows → leave `created_by = NULL` and log.

### Rollback/Idempotency

- Re-runs:
  - If the user exists in Supabase, skip create; just ensure mapping and `public.users` row.
  - Re-apply authorship updates safely with `IS DISTINCT FROM` guards.

### Privacy

- Handle user data exports securely; delete raw exports after migration.
