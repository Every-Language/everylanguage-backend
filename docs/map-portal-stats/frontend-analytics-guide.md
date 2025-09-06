### Frontend Guide: Language Analytics Heatmaps and Stats

This guide enables an AI agent to implement the Map Portal analytics UI using `supabase-js` against the language-scoped analytics views.

What you can render now (time-insensitive):

- **Listens heatmap**: aggregated points from verse, chapter, and media-file listens
- **App downloads heatmap**: aggregated by share source
- **Stats**: total app downloads, total listening time, and popular chapters

Key views (already created via migrations):

- `vw_language_listens_heatmap(language_entity_id, grid geometry(Point, 4326), event_count int, last_event_at timestamptz)`
- `vw_language_app_downloads_heatmap(language_entity_id, grid geometry(Point, 4326), download_count int, last_download_at timestamptz)`
- `vw_language_downloads_count(language_entity_id, downloads bigint)`
- `vw_language_listening_time(language_entity_id, total_listened_seconds bigint, last_listened_at timestamptz)`
- `vw_language_popular_chapters(language_entity_id, chapter_id text, listen_count bigint, recent_listen_at timestamptz)`

Notes:

- Spatial `grid` is snapped to a 0.5° grid using PostGIS `ST_SnapToGrid` in SRID 4326. X is longitude, Y is latitude.
- Time filters are not included yet by design. Only “last\_...” timestamps are surfaced for tooltips/recency hints.

Prereqs

- You have a Supabase client: `const supabase = createClient(SUPABASE_URL, ANON_KEY)`
- Public RLS allows read access to the above views

#### Utility types

```ts
type UUID = string;

type HeatmapPoint = {
  lon: number;
  lat: number;
  count: number; // event_count or download_count
  lastAt: string; // ISO string from last_event_at / last_download_at
};

type DownloadsCount = { downloads: number };
type ListeningTime = {
  total_listened_seconds: number;
  last_listened_at: string | null;
};

type PopularChapter = {
  chapter_id: string; // e.g., 'CH_GEN_1'
  listen_count: number;
  recent_listen_at: string | null;
};
```

### Geometry handling (choose one)

- Preferred: PostgREST commonly returns geometry as GeoJSON. If `grid` arrives as `{ type: 'Point', coordinates: [lon, lat] }`, parse directly.
- If your client receives WKB/WKT instead, add thin wrapper views later with `ST_X(grid) AS grid_lon`, `ST_Y(grid) AS grid_lat` and read those numeric columns. For now, assume GeoJSON.

### Listens heatmap (by language)

```ts
export const fetchLanguageListensHeatmap = async (
  supabase: any,
  languageEntityId: UUID
): Promise<HeatmapPoint[]> => {
  const { data, error } = await supabase
    .from('vw_language_listens_heatmap')
    .select('grid, event_count, last_event_at')
    .eq('language_entity_id', languageEntityId);

  if (error) throw error;
  if (!data) return [];

  // grid as GeoJSON Point
  return data
    .filter((row: any) => row.grid && row.grid.type === 'Point')
    .map((row: any) => ({
      lon: row.grid.coordinates[0],
      lat: row.grid.coordinates[1],
      count: row.event_count,
      lastAt: row.last_event_at,
    }));
};
```

### App downloads heatmap (by language)

```ts
export const fetchLanguageDownloadsHeatmap = async (
  supabase: any,
  languageEntityId: UUID
): Promise<HeatmapPoint[]> => {
  const { data, error } = await supabase
    .from('vw_language_app_downloads_heatmap')
    .select('grid, download_count, last_download_at')
    .eq('language_entity_id', languageEntityId);

  if (error) throw error;
  if (!data) return [];

  return data
    .filter((row: any) => row.grid && row.grid.type === 'Point')
    .map((row: any) => ({
      lon: row.grid.coordinates[0],
      lat: row.grid.coordinates[1],
      count: row.download_count,
      lastAt: row.last_download_at,
    }));
};
```

### Stats (by language)

Downloads count:

```ts
export const fetchLanguageDownloadsCount = async (
  supabase: any,
  languageEntityId: UUID
): Promise<DownloadsCount> => {
  const { data, error } = await supabase
    .from('vw_language_downloads_count')
    .select('downloads')
    .eq('language_entity_id', languageEntityId)
    .single();

  if (error) throw error;
  return { downloads: data?.downloads ?? 0 };
};
```

Listening time:

```ts
export const fetchLanguageListeningTime = async (
  supabase: any,
  languageEntityId: UUID
): Promise<ListeningTime> => {
  const { data, error } = await supabase
    .from('vw_language_listening_time')
    .select('total_listened_seconds, last_listened_at')
    .eq('language_entity_id', languageEntityId)
    .single();

  if (error) throw error;
  return {
    total_listened_seconds: Number(data?.total_listened_seconds ?? 0),
    last_listened_at: data?.last_listened_at ?? null,
  };
};
```

Popular chapters:

```ts
export const fetchLanguagePopularChapters = async (
  supabase: any,
  languageEntityId: UUID,
  limit = 50
): Promise<PopularChapter[]> => {
  const { data, error } = await supabase
    .from('vw_language_popular_chapters')
    .select('chapter_id, listen_count, recent_listen_at')
    .eq('language_entity_id', languageEntityId)
    .order('listen_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    chapter_id: row.chapter_id,
    listen_count: Number(row.listen_count ?? 0),
    recent_listen_at: row.recent_listen_at ?? null,
  }));
};
```

### Rendering notes

- For heatmaps using Mapbox/Leaflet:

  - Convert `HeatmapPoint` into layer source features `{ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { weight: count } }`.
  - Normalize weights per zoom if needed. Example: `weight = Math.log(count + 1)` to compress outliers.
  - Tooltip: format ISO timestamps from `lastAt` to a friendly time.

- If geometry is not delivered as GeoJSON:
  - Temporary client-side fallback: request both views and run a one-time DB change later to expose `grid_lon`, `grid_lat` as numeric columns for frictionless reads.

### Performance and pagination

- Language-scoped aggregations are reasonably sized; fetch-all per language is fine initially.
- If results become heavy, add server-side bounding-box/time filtering by introducing alternate parameterized views later (e.g., `vw_language_listens_heatmap_30d`, `vw_language_listens_heatmap_bbox`).
- Grid size is 0.5°. To reduce points, increase grid size in the view definition when you introduce versioned or alternate views.

### Future extensions (not implemented yet)

- Time-windowed heatmaps (e.g., last 7/30/90 days) via separate views or parameters
- Share trees and directional flows (needs an additional view over `shares` using `parent_share_id`)
- Project-scoped analytics (requires schema scoping or view joins)
