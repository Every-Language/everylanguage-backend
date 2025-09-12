#!/usr/bin/env node

/**
 * Natural Earth Countries SQL Generator
 *
 * This script generates SQL seed files from Natural Earth country data
 * for importing into your regions schema.
 *
 * Prerequisites:
 * - npm install shapefile
 * - Natural Earth data in ./naturalearth/ directory
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import console from 'console';
import shapefile from 'shapefile';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Continent mapping from Natural Earth CONTINENT field
const CONTINENT_MAPPING = {
  Africa: 'Africa',
  'North America': 'North America',
  'South America': 'South America',
  Asia: 'Asia',
  Europe: 'Europe',
  Oceania: 'Oceania',
  Antarctica: 'Antarctica',
};

// Region mapping from Natural Earth REGION_UN field
const REGION_MAPPING = {
  Africa: [
    'Eastern Africa',
    'Middle Africa',
    'Northern Africa',
    'Southern Africa',
    'Western Africa',
  ],
  Asia: [
    'Central Asia',
    'Eastern Asia',
    'South-Eastern Asia',
    'Southern Asia',
    'Western Asia',
  ],
  Europe: [
    'Eastern Europe',
    'Northern Europe',
    'Southern Europe',
    'Western Europe',
  ],
  'North America': ['Northern America', 'Caribbean', 'Central America'],
  'South America': ['South America'],
  Oceania: [
    'Australia and New Zealand',
    'Melanesia',
    'Micronesia',
    'Polynesia',
  ],
};

function cleanText(text) {
  if (!text) return '';
  // Remove null characters and other problematic Unicode
  const nullChar = String.fromCharCode(0);
  return text
    .toString()
    .replace(new RegExp(nullChar, 'g'), '')
    .trim()
    .normalize('NFC');
}

function generateId() {
  return randomUUID();
}

function escapeSqlString(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

// Fix common UTF-8/Latin1 mojibake patterns while preserving already-correct text
function fixMojibakeIfNeeded(text) {
  if (!text) return '';
  const value = text.toString();
  // Heuristics: apply only if typical mojibake markers are present
  // - 'Ã', 'Â' (UTF-8 bytes misread as Latin1)
  // - 'Ð', 'Ø' (common for Cyrillic/Arabic mojibake)
  // - 'ä¸' sequence (very common at start of Chinese mojibake)
  if (/[ÃÂÐØ]/.test(value) || value.includes('ä¸')) {
    try {
      return Buffer.from(value, 'latin1').toString('utf8').normalize('NFC');
    } catch {
      // Fallback: return original if conversion fails
      return value;
    }
  }
  return value;
}

function generateHierarchySQL() {
  console.log('Generating hierarchy SQL...');

  const continents = [];
  const worldRegions = [];
  const parentMap = {};

  // Create continents
  for (const continent of Object.keys(CONTINENT_MAPPING)) {
    const continentId = generateId();
    continents.push({
      id: continentId,
      name: continent,
      level: 'continent',
      parent_id: null,
    });
    parentMap[continent] = continentId;

    // Create world regions for this continent
    const regions = REGION_MAPPING[continent] || [];
    for (const region of regions) {
      const regionId = generateId();
      worldRegions.push({
        id: regionId,
        name: region,
        level: 'world_region',
        parent_id: continentId,
      });
      parentMap[region] = regionId;
    }
  }

  let sql = '-- Regions Hierarchy Seed Data\n';
  sql += '-- Generated from Natural Earth data\n\n';

  // Insert continents using bulk INSERT
  if (continents.length > 0) {
    sql += '-- Insert continents\n';
    sql +=
      'INSERT INTO regions (id, name, level, parent_id, created_at) VALUES\n';
    const continentValues = continents.map(
      continent =>
        `  ('${continent.id}', '${escapeSqlString(continent.name)}', '${continent.level}', NULL, NOW())`
    );
    sql += continentValues.join(',\n');
    sql += '\nON CONFLICT (id) DO NOTHING;\n\n';
  }

  // Insert world regions using bulk INSERT
  if (worldRegions.length > 0) {
    sql += '-- Insert world regions\n';
    sql +=
      'INSERT INTO regions (id, name, level, parent_id, created_at) VALUES\n';
    const regionValues = worldRegions.map(
      region =>
        `  ('${region.id}', '${escapeSqlString(region.name)}', '${region.level}', '${region.parent_id}', NOW())`
    );
    sql += regionValues.join(',\n');
    sql += '\nON CONFLICT (id) DO NOTHING;\n\n';
  }

  // Insert aliases for continents and world regions using bulk INSERT
  const allAliases = [];
  for (const continent of continents) {
    allAliases.push({
      id: generateId(),
      region_id: continent.id,
      alias_name: continent.name,
    });
  }
  for (const region of worldRegions) {
    allAliases.push({
      id: generateId(),
      region_id: region.id,
      alias_name: region.name,
    });
  }

  if (allAliases.length > 0) {
    sql +=
      '-- Insert aliases for continents and world regions (for fuzzy search)\n';
    sql +=
      'INSERT INTO region_aliases (id, region_id, alias_name, created_at) VALUES\n';
    const aliasValues = allAliases.map(
      alias =>
        `  ('${alias.id}', '${alias.region_id}', '${escapeSqlString(alias.alias_name)}', NOW())`
    );
    sql += aliasValues.join(',\n');
    sql += '\nON CONFLICT (id) DO NOTHING;\n\n';
  }

  console.log(
    `Generated SQL for ${continents.length} continents and ${worldRegions.length} world regions`
  );

  return { sql, parentMap };
}

async function generateCountriesSQL(parentMap, shapefilePath) {
  console.log('Processing Natural Earth shapefile...');

  // Explicitly set DBF decoding to UTF-8 and provide .dbf path to ensure attributes load
  const dbfPath = shapefilePath.replace(/\.shp$/i, '.dbf');
  const source = await shapefile.open(shapefilePath, dbfPath, {
    encoding: 'utf8',
  });

  let countriesSQL = '-- Countries Seed Data\n';
  countriesSQL += '-- Generated from Natural Earth data\n\n';

  let sourcesSQL = '-- Region Sources Seed Data\n';
  sourcesSQL += '-- Generated from Natural Earth data\n\n';

  let aliasesSQL = '-- Region Aliases Seed Data\n';
  aliasesSQL += '-- Generated from Natural Earth data\n\n';

  let propertiesSQL = '-- Region Properties Seed Data\n';
  propertiesSQL += '-- Generated from Natural Earth data\n\n';

  // Collect all data first for bulk operations
  const countries = [];
  const sources = [];
  const aliases = [];
  const properties = [];

  let result = await source.read();
  let count = 0;

  while (!result.done) {
    const country = result.value;
    const props = country.properties;
    const geometry = country.geometry;

    if (!props.NAME) {
      result = await source.read();
      continue;
    }

    const regionId = generateId();
    count++;

    // Determine parent (prefer world region over continent)
    let parentId = null;
    const subregion = props.SUBREGION ? props.SUBREGION.trim() : null;
    const continent = props.CONTINENT ? props.CONTINENT.trim() : null;

    if (subregion && parentMap[subregion]) {
      parentId = parentMap[subregion];
    } else if (continent && parentMap[continent]) {
      parentId = parentMap[continent];
    }

    // Convert Polygon to MultiPolygon if needed
    let boundaryGeometry = geometry;
    if (geometry && geometry.type === 'Polygon') {
      boundaryGeometry = {
        type: 'MultiPolygon',
        coordinates: [geometry.coordinates],
      };
    }

    // Main region record
    const cleanName = fixMojibakeIfNeeded(cleanText(props.NAME));
    const geometrySQL = boundaryGeometry
      ? `ST_GeomFromGeoJSON('${JSON.stringify(boundaryGeometry).replace(/'/g, "''")}')`
      : 'NULL';

    countries.push({
      id: regionId,
      name: cleanName,
      parent_id: parentId,
      geometry_sql: geometrySQL,
    });

    // Create multiple source entries
    const countrySources = [
      {
        source: 'natural_earth',
        external_id_type: 'natural_earth_admin',
        external_id: props.ADM0_A3,
        version: 'v5.1.1',
      },
      {
        source: 'natural_earth',
        external_id_type: 'iso3166-1-alpha2',
        external_id: props.ISO_A2,
        version: '2023',
      },
      {
        source: 'natural_earth',
        external_id_type: 'iso3166-1-alpha3',
        external_id: props.ISO_A3,
        version: '2023',
      },
      {
        source: 'natural_earth',
        external_id_type: 'iso3166-1-numeric',
        external_id: props.ISO_N3,
        version: '2023',
      },
      {
        source: 'natural_earth',
        external_id_type: 'un_a3',
        external_id: props.UN_A3,
        version: '2023',
      },
      {
        source: 'natural_earth',
        external_id_type: 'world_bank_a2',
        external_id: props.WB_A2,
        version: '2023',
      },
      {
        source: 'natural_earth',
        external_id_type: 'world_bank_a3',
        external_id: props.WB_A3,
        version: '2023',
      },
      {
        source: 'natural_earth',
        external_id_type: 'wikidata',
        external_id: props.WIKIDATAID,
        version: '2023',
      },
    ];

    countrySources.forEach(src => {
      const cleanExternalId = cleanText(src.external_id);
      if (cleanExternalId) {
        sources.push({
          id: generateId(),
          region_id: regionId,
          source: src.source,
          external_id_type: src.external_id_type,
          external_id: cleanExternalId,
          version: src.version,
        });
      }
    });

    // Create aliases for alternative names (including the main name for fuzzy search)
    const countryAliases = [
      cleanName, // Add the main name as an alias for fuzzy search
      props.NAME_LONG,
      props.FORMAL_EN,
      props.FORMAL_FR,
      props.ADMIN,
      props.SOVEREIGNT,
      props.ABBREV,
      props.NAME_AR,
      props.NAME_DE,
      props.NAME_ES,
      props.NAME_FR,
      props.NAME_ZH,
      props.NAME_RU,
      props.NAME_PT,
    ];

    // Use a Set to track already-added aliases to avoid duplicates
    const addedAliases = new Set();

    countryAliases.forEach(alias => {
      const cleanAlias = fixMojibakeIfNeeded(cleanText(alias));
      if (cleanAlias && !addedAliases.has(cleanAlias.toLowerCase())) {
        addedAliases.add(cleanAlias.toLowerCase());
        aliases.push({
          id: generateId(),
          region_id: regionId,
          alias_name: cleanAlias,
        });
      }
    });

    // Create properties
    const countryProperties = [
      { key: 'continent', value: fixMojibakeIfNeeded(props.CONTINENT) },
      { key: 'region_un', value: fixMojibakeIfNeeded(props.REGION_UN) },
      { key: 'subregion', value: fixMojibakeIfNeeded(props.SUBREGION) },
      { key: 'region_wb', value: fixMojibakeIfNeeded(props.REGION_WB) },
      { key: 'population', value: props.POP_EST?.toString() || '0' },
      { key: 'gdp_md', value: props.GDP_MD?.toString() || '0' },
      { key: 'economy', value: fixMojibakeIfNeeded(props.ECONOMY) },
      { key: 'income_group', value: fixMojibakeIfNeeded(props.INCOME_GRP) },
      { key: 'type', value: fixMojibakeIfNeeded(props.TYPE) },
      { key: 'label_x', value: props.LABEL_X?.toString() || '' },
      { key: 'label_y', value: props.LABEL_Y?.toString() || '' },
    ];

    countryProperties.forEach(prop => {
      const cleanValue = cleanText(prop.value);
      if (cleanValue) {
        properties.push({
          id: generateId(),
          region_id: regionId,
          key: prop.key,
          value: cleanValue,
        });
      }
    });

    result = await source.read();
  }

  // Generate bulk INSERT statements
  if (countries.length > 0) {
    countriesSQL +=
      'INSERT INTO regions (id, name, level, parent_id, boundary, created_at) VALUES\n';
    const countryValues = countries.map(country => {
      const parentIdSQL = country.parent_id ? `'${country.parent_id}'` : 'NULL';
      return `  ('${country.id}', '${escapeSqlString(country.name)}', 'country', ${parentIdSQL}, ${country.geometry_sql}, NOW())`;
    });
    countriesSQL += countryValues.join(',\n');
    countriesSQL += '\nON CONFLICT (id) DO NOTHING;\n';
  }

  if (sources.length > 0) {
    sourcesSQL +=
      'INSERT INTO region_sources (id, region_id, source, external_id_type, external_id, version, is_external, created_at) VALUES\n';
    const sourceValues = sources.map(
      source =>
        `  ('${source.id}', '${source.region_id}', '${escapeSqlString(source.source)}', '${escapeSqlString(source.external_id_type)}', '${escapeSqlString(source.external_id)}', '${escapeSqlString(source.version)}', true, NOW())`
    );
    sourcesSQL += sourceValues.join(',\n');
    sourcesSQL += '\nON CONFLICT (id) DO NOTHING;\n';
  }

  if (aliases.length > 0) {
    aliasesSQL +=
      'INSERT INTO region_aliases (id, region_id, alias_name, created_at) VALUES\n';
    const aliasValues = aliases.map(
      alias =>
        `  ('${alias.id}', '${alias.region_id}', '${escapeSqlString(alias.alias_name)}', NOW())`
    );
    aliasesSQL += aliasValues.join(',\n');
    aliasesSQL += '\nON CONFLICT (id) DO NOTHING;\n';
  }

  if (properties.length > 0) {
    propertiesSQL +=
      'INSERT INTO region_properties (id, region_id, key, value, created_at) VALUES\n';
    const propertyValues = properties.map(
      property =>
        `  ('${property.id}', '${property.region_id}', '${escapeSqlString(property.key)}', '${escapeSqlString(property.value)}', NOW())`
    );
    propertiesSQL += propertyValues.join(',\n');
    propertiesSQL += '\nON CONFLICT (id) DO NOTHING;\n';
  }

  console.log(`Generated SQL for ${count} countries`);

  return {
    countriesSQL,
    sourcesSQL,
    aliasesSQL,
    propertiesSQL,
  };
}

async function main() {
  try {
    console.log('Starting Natural Earth SQL generation...');

    // Build paths relative to the project root (two levels up from this script)
    const projectRoot = path.resolve(__dirname, '../..');
    const shapefilePath = path.join(
      projectRoot,
      'assets/data/regions/naturalearth/ne_50m_admin_0_countries.shp'
    );
    const outputDir = path.join(
      projectRoot,
      'supabase/seed/production/10_regions'
    );

    // Check if shapefile exists
    if (!fs.existsSync(shapefilePath)) {
      console.error(
        '❌ Shapefile not found. Please ensure Natural Earth data is in assets/data/regions/naturalearth/ directory.'
      );
      console.error(`Looking for: ${shapefilePath}`);
      process.exit(1);
    }

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate hierarchy SQL
    const { sql: hierarchySQL, parentMap } = generateHierarchySQL();
    fs.writeFileSync(
      path.join(outputDir, '01_regions_hierarchy.sql'),
      hierarchySQL
    );

    // Generate countries SQL
    const { countriesSQL, sourcesSQL, aliasesSQL, propertiesSQL } =
      await generateCountriesSQL(parentMap, shapefilePath);

    fs.writeFileSync(
      path.join(outputDir, '02_regions_countries.sql'),
      countriesSQL
    );
    fs.writeFileSync(path.join(outputDir, '03_region_sources.sql'), sourcesSQL);
    fs.writeFileSync(path.join(outputDir, '04_region_aliases.sql'), aliasesSQL);
    fs.writeFileSync(
      path.join(outputDir, '05_region_properties.sql'),
      propertiesSQL
    );

    // Create a master import file
    const masterSQL = `-- Master Regions Import
-- Generated from Natural Earth v5.1.1 data
-- Run these files in order:

-- WARNING: This will DELETE all existing region data before importing!
-- Make sure you have backups if needed.

-- Clear existing data (in dependency order)
DELETE FROM region_properties WHERE region_id IN (SELECT id FROM regions);
DELETE FROM region_aliases WHERE region_id IN (SELECT id FROM regions);
DELETE FROM region_sources WHERE region_id IN (SELECT id FROM regions);
DELETE FROM language_entities_regions WHERE region_id IN (SELECT id FROM regions);
DELETE FROM regions;

\\i supabase/seed/production/10_regions/01_regions_hierarchy.sql
\\i supabase/seed/production/10_regions/02_regions_countries.sql
\\i supabase/seed/production/10_regions/03_region_sources.sql
\\i supabase/seed/production/10_regions/04_region_aliases.sql
\\i supabase/seed/production/10_regions/05_region_properties.sql

-- Fix parent relationships by linking countries to their world regions
UPDATE regions 
SET parent_id = wr.id
FROM region_properties rp, regions wr
WHERE regions.id = rp.region_id 
AND regions.level = 'country'
AND rp.key = 'subregion'
AND wr.name = rp.value
AND wr.level = 'world_region';

-- Note: All region names (including primary names) are added to region_aliases 
-- for comprehensive fuzzy search functionality

-- Verify the import
SELECT 
  'regions' as table_name, 
  count(*) as count 
FROM regions
UNION ALL
SELECT 'region_sources', count(*) FROM region_sources  
UNION ALL
SELECT 'region_aliases', count(*) FROM region_aliases
UNION ALL
SELECT 'region_properties', count(*) FROM region_properties;

-- Check hierarchy
SELECT level, count(*) as count 
FROM regions 
GROUP BY level 
ORDER BY 
  CASE level 
    WHEN 'continent' THEN 1 
    WHEN 'world_region' THEN 2 
    WHEN 'country' THEN 3 
    ELSE 4 
  END;

-- Check external ID types distribution
SELECT 
  source,
  external_id_type,
  count(*) as count
FROM region_sources 
GROUP BY source, external_id_type 
ORDER BY source, external_id_type;

-- Check parent relationships (should show most countries linked to world regions)
SELECT 
  'Countries with parents' as check_type,
  count(*) as count
FROM regions 
WHERE level = 'country' AND parent_id IS NOT NULL
UNION ALL
SELECT 
  'Countries without parents',
  count(*)
FROM regions 
WHERE level = 'country' AND parent_id IS NULL;
`;

    fs.writeFileSync(path.join(outputDir, '00_import_all.sql'), masterSQL);

    console.log('✅ SQL generation completed successfully!');
    console.log(`📁 Generated production seed files in: ${outputDir}/`);
    console.log('📝 Files created:');
    console.log('   00_import_all.sql - Master import script');
    console.log('   01_regions_hierarchy.sql - Continents and world regions');
    console.log('   02_regions_countries.sql - Countries with boundaries');
    console.log('   03_region_sources.sql - External source IDs');
    console.log('   04_region_aliases.sql - Alternative names');
    console.log('   05_region_properties.sql - Metadata properties');
  } catch (error) {
    console.error('❌ SQL generation failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
