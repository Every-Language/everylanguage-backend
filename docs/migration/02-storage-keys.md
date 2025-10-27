## Storage and Object Keys

### Source (S3)

- Buckets (from CDK outputs): `AudioFilesBucketName` like `omt-audio-files-{stage}-{account}`.
- Key pattern: under `translations/` prefix (per IAM policies).

### Target (Cloudflare R2)

- Buckets:
  - Dev: `el-backend-dev-media-files`
  - Prod: `el-backend-prod-media-files`
- In DB, store only the `object_key` (no bucket/URL). Use `storage_provider = 'r2'`.

### Object Key Format

- Use existing stable format: `{timestamp}-{filename}.{ext}`.
- Example: `1754634514201-Bhujel_Psalms_Chapter116_V001_019.mp3`.
- Rationale: minimal churn, easy dedupe, consistent with current codepaths.

### Copy Strategy (S3 → R2)

- Stream copy per object:
  - S3 GetObject → R2 PutObject with the target `object_key`.
  - Set content type and length when possible.
  - Verify: compare Content-Length with source; optionally compute SHA-256 for spot checks.
- Concurrency: 5–20 parallel copies (tune based on network/limits).
- Retries: exponential backoff on 5xx and network errors.

### Post-Copy Validation

- For a sample set, generate signed CDN URLs and issue HEAD/GET to ensure object exists and supports Range requests.
- Keep a manifest of copied keys and sizes to support re-runs.
