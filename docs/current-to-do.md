cron job for refreshing materialized views
In Supabase dashboard → Edge Functions → Add Schedule:
Name: refresh-progress-cron
Function: refresh-progress
Schedule: choose interval (e.g., every 15 minutes) or CRON _/15 _ \* \* \*
Auth: allow anon or secure with a secret header if desired

migrate to using user roles for access rather than simple created_by

allow community checking of verse texts too

migrate to terraform for IaC

add sequence_id to media files

implement railway backgroudn worker for package tracking

new schema for playlists

remove user_version_selections

PACKAGING

- remove the user_saved_audio_versions_downloads entry??

great. please read thru my codebase to give yourself context then implement:

- migration to add version_packages table with storage_provider and object_key. dont do dev/prod column - i have two completely different supabase projects for dev and prod so we'll need to insert into the correct project. also have package_type, version_id, scope_key (build a scope key for audio versions, can be null for text versions as they are the whole bible or alternatively do the scope key as you suggested with|full), created_at, status, error. we'll have one row per version and scope so new builds can upsert
- i think for checking updated at, lets go with the simple approach with no triggers and compute on demmand. i feel that maintaining a rollup, especially with so many media_files, may be more expensive
- modify the text and audio workers to first check the version_packages table and see if there have been any updates to the media files for that audio version (max updated_at). if not, instantly return zip from version_packages table. if there are updates, notify of background job, rebuild package, update version_packages table, then make new package available
