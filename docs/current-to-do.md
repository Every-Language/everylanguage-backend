? RLS for amterialized views / views

migrate to using user roles for access rather than simple created_by

allow community checking of verse texts too

migrate to terraform for IaC

add sequence_id to media files

Fixes

- RLS for materl

schema changes

- add sequence_id to media files
- redesign playlists schema (denormalize to be compatible with powersync)
- remove user_version_selections table

Features

- server side package generation
  - add version_packages table with storage_provider and object_key, package_type, version_id, scope_key (for audio versions), created_at, status, error
  - modify text and audio workers to check the version packages table and see if there have been updates

Roadmap items — what/why
Visibility flags and public*\* views:
Add is_public boolean (or visibility enum) to parent tables.
Create curated views (public_projects, public_bases, etc.) that select only public rows and only public-safe columns.
Grant anon access to the views; keep direct table access for authenticated only. This gives you a stable, cacheable public surface and keeps sensitive columns hidden.
Private-only children tables:
For data that must never be public (e.g., finance), create separate tables like project_private_properties with project_id.
Gate them with a specific permission (e.g., project.read_private) via has_permission. This avoids complex per-column visibility and keeps RLS simple.
Site/domain gating RPC + RLS:
Table sites(id, domain, context_type, context_id, is_enabled) to map hostnames to contexts (e.g., partner org).
RPC can_access_site(domain text) returns boolean by checking the mapping and has_permission(auth.uid(), '<context>.read', '<context>', context_id).
Frontend: after login, call RPC with window.location.host; sign out/redirect if false.
Caching:
Put a CDN/Edge (e.g., Cloudflare Worker) in front of your public*\* views.
Use short TTLs and purges on write events (e.g., invalidate by project id when project.write changes data). This yields fast public pages while respecting freshness.
