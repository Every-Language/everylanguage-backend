#!/usr/bin/env node

/**
 * Language Data Seed Generator
 *
 * Parses ISO 639-3 and ROLV data files and generates SQL seed files
 * according to the mapping plans in assets/data/languages/
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Configuration
const CONFIG = {
  outputDir: 'supabase/seed/production/11_languages',
  dataDir: 'assets/data/languages',
  version: '2025',
  chunkSize: 1000, // Records per SQL file
};

// UUID mapping to ensure consistency
const entityUUIDs = new Map(); // external_id -> UUID

// Data stores
const languageEntities = [];
const languageEntitySources = [];
const languageAliases = [];
const languageProperties = [];
const languageEntitiesRegions = [];

/**
 * Utility functions
 */
function generateUUID() {
  return randomUUID();
}

function getOrCreateEntityUUID(externalId) {
  if (!entityUUIDs.has(externalId)) {
    entityUUIDs.set(externalId, generateUUID());
  }
  return entityUUIDs.get(externalId);
}

function sanitizeSQL(text) {
  if (!text) return '';
  return text.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function mapLanguageType(code) {
  const mapping = {
    L: 'Living',
    E: 'Extinct',
    A: 'Ancient',
    H: 'Historical',
    C: 'Constructed',
    S: 'Special',
  };
  return mapping[code] || code;
}

function mapScopeToLevel(scope) {
  const mapping = {
    M: 'family', // Macrolanguage
    I: 'language', // Individual
    S: 'language', // Special
  };
  return mapping[scope] || 'language';
}

/**
 * Parse TSV files
 */
function parseTSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split('\t');

  return lines.slice(1).map(line => {
    const values = line.split('\t');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

/**
 * Process ISO 639-3 main file
 */
function processISO639Main() {
  console.log('Processing ISO 639-3 main file...');

  const filePath = path.join(CONFIG.dataDir, 'iso639-3/iso-639-3.tab');
  const data = parseTSV(filePath);

  data.forEach(row => {
    const entityUUID = getOrCreateEntityUUID(row.Id);

    // 1. language_entities entry
    languageEntities.push({
      id: entityUUID,
      name: sanitizeSQL(row.Ref_Name),
      level: mapScopeToLevel(row.Scope),
      parent_id: null, // Will be set later from macrolanguages
      created_at: 'NOW()',
      updated_at: 'NOW()',
    });

    // 2. language_entity_sources entry for ISO 639-3
    languageEntitySources.push({
      id: generateUUID(),
      language_entity_id: entityUUID,
      source: 'SIL',
      version: CONFIG.version,
      is_external: true,
      external_id_type: 'iso-639-3',
      external_id: row.Id,
      created_by: null,
    });

    // 3. language_entity_sources entry for ISO 639-1 (if exists)
    if (row.Part1 && row.Part1.trim()) {
      languageEntitySources.push({
        id: generateUUID(),
        language_entity_id: entityUUID,
        source: 'SIL',
        version: CONFIG.version,
        is_external: true,
        external_id_type: 'iso-639-1',
        external_id: row.Part1,
        created_by: null,
      });
    }

    // 4. language_properties entry for language type
    languageProperties.push({
      id: generateUUID(),
      language_entity_id: entityUUID,
      key: 'iso_639_language_type',
      value: mapLanguageType(row.Language_Type),
      created_at: 'NOW()',
    });

    // 5. language_aliases entry for primary name
    languageAliases.push({
      id: generateUUID(),
      language_entity_id: entityUUID,
      alias_name: sanitizeSQL(row.Ref_Name),
      created_at: 'NOW()',
    });
  });

  console.log(`✓ Processed ${data.length} ISO 639-3 entries`);
}

/**
 * Process ISO 639-3 macrolanguages
 */
function processISO639Macrolanguages() {
  console.log('Processing ISO 639-3 macrolanguages...');

  const filePath = path.join(
    CONFIG.dataDir,
    'iso639-3/iso-639-3-macrolanguages.tab'
  );
  const data = parseTSV(filePath);

  // Create mapping of individual -> macro for later parent_id updates
  const macroMappings = new Map();

  data.forEach(row => {
    if (row.I_Status === 'A') {
      // Active only
      macroMappings.set(row.I_Id, row.M_Id);
    }
  });

  // Update parent_id in languageEntities
  languageEntities.forEach(entity => {
    const externalId = Array.from(entityUUIDs.entries()).find(
      ([_key, uuid]) => uuid === entity.id
    )?.[0];

    if (externalId && macroMappings.has(externalId)) {
      const macroId = macroMappings.get(externalId);
      entity.parent_id = getOrCreateEntityUUID(macroId);
    }
  });

  console.log(`✓ Processed ${data.length} macrolanguage mappings`);
}

/**
 * Process ISO 639-3 name index
 */
function processISO639NameIndex() {
  console.log('Processing ISO 639-3 name index...');

  const filePath = path.join(
    CONFIG.dataDir,
    'iso639-3/iso-639-3_Name_Index.tab'
  );
  const data = parseTSV(filePath);

  data.forEach(row => {
    const entityUUID = getOrCreateEntityUUID(row.Id);

    // Add print name alias (skip if same as primary name)
    const printName = sanitizeSQL(row.Print_Name);
    if (
      printName &&
      !languageAliases.find(
        a => a.language_entity_id === entityUUID && a.alias_name === printName
      )
    ) {
      languageAliases.push({
        id: generateUUID(),
        language_entity_id: entityUUID,
        alias_name: printName,
        created_at: 'NOW()',
      });
    }

    // Add inverted name alias (if different from print name)
    const invertedName = sanitizeSQL(row.Inverted_Name);
    if (
      invertedName &&
      invertedName !== printName &&
      !languageAliases.find(
        a =>
          a.language_entity_id === entityUUID && a.alias_name === invertedName
      )
    ) {
      languageAliases.push({
        id: generateUUID(),
        language_entity_id: entityUUID,
        alias_name: invertedName,
        created_at: 'NOW()',
      });
    }
  });

  console.log(`✓ Processed ${data.length} name index entries`);
}

/**
 * Process ROLV main data
 */
function processROLVMain() {
  console.log('Processing ROLV main data...');

  const filePath = path.join(CONFIG.dataDir, 'grn/ROLV.json');
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const data = jsonData.data.ROLVCodes;

  data.forEach(row => {
    const entityUUID = generateUUID();
    const parentUUID = getOrCreateEntityUUID(row.LanguageCode);

    // 1. language_entities entry
    languageEntities.push({
      id: entityUUID,
      name: sanitizeSQL(row.VarietyName),
      level: 'dialect',
      parent_id: parentUUID,
      created_at: 'NOW()',
      updated_at: 'NOW()',
    });

    // Store mapping for ROLV lookups
    entityUUIDs.set(row.LanguageTag, entityUUID);

    // 2. language_entity_sources entry for ROLV code (if valid)
    if (row.ROLVCode) {
      languageEntitySources.push({
        id: generateUUID(),
        language_entity_id: entityUUID,
        source: 'GRN',
        version: CONFIG.version,
        is_external: true,
        external_id_type: 'rolv_code',
        external_id: row.ROLVCode.toString(),
        created_by: null,
      });
    }

    // 3. language_entity_sources entry for IETF language tag (if valid)
    if (row.LanguageTag && row.LanguageTag.trim()) {
      languageEntitySources.push({
        id: generateUUID(),
        language_entity_id: entityUUID,
        source: 'IETF',
        version: CONFIG.version,
        is_external: true,
        external_id_type: 'bcp-47',
        external_id: row.LanguageTag.trim(),
        created_by: null,
      });
    }

    // 4. language_aliases entry for primary name
    languageAliases.push({
      id: generateUUID(),
      language_entity_id: entityUUID,
      alias_name: sanitizeSQL(row.VarietyName),
      created_at: 'NOW()',
    });

    // 5. Regional association - link to country regions via ISO country codes
    if (
      row.CountryCode &&
      row.CountryCode.trim() &&
      row.CountryCode.length === 2
    ) {
      languageEntitiesRegions.push({
        id: generateUUID(),
        language_entity_id: entityUUID,
        country_code: row.CountryCode.trim().toUpperCase(), // Ensure consistent format
        dominance_level: 1.0, // Primary dominance = maximum (1.0)
        created_at: 'NOW()',
      });
    }
  });

  console.log(`✓ Processed ${data.length} ROLV entries`);
}

/**
 * Process ROLV alternate names
 */
function processROLVAltNames() {
  console.log('Processing ROLV alternate names...');

  const filePath = path.join(CONFIG.dataDir, 'grn/rolv_altnames.json');
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const data = jsonData.data.ROLVAlternateNames;

  data.forEach(row => {
    const entityUUID = entityUUIDs.get(row.LanguageTag);

    if (entityUUID) {
      languageAliases.push({
        id: generateUUID(),
        language_entity_id: entityUUID,
        alias_name: sanitizeSQL(row.AlternateName),
        created_at: 'NOW()',
      });
    } else {
      console.warn(
        `Warning: No entity found for LanguageTag ${row.LanguageTag}`
      );
    }
  });

  console.log(`✓ Processed ${data.length} ROLV alternate names`);
}

/**
 * Generate SQL files
 */
function generateSQLFiles() {
  console.log('Generating SQL files...');

  // Ensure output directory exists
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  // Generate language_entities
  generateChunkedSQL('language_entities', languageEntities, [
    'id',
    'name',
    'level',
    'parent_id',
    'created_at',
    'updated_at',
  ]);

  // Generate language_entity_sources
  generateChunkedSQL('language_entity_sources', languageEntitySources, [
    'id',
    'language_entity_id',
    'source',
    'version',
    'is_external',
    'external_id_type',
    'external_id',
    'created_by',
  ]);

  // Generate language_aliases
  generateChunkedSQL('language_aliases', languageAliases, [
    'id',
    'language_entity_id',
    'alias_name',
    'created_at',
  ]);

  // Generate language_properties
  generateChunkedSQL('language_properties', languageProperties, [
    'id',
    'language_entity_id',
    'key',
    'value',
    'created_at',
  ]);

  // Generate language_entities_regions with SQL to resolve country codes
  generateLanguageRegionsSQL();

  // Generate master import file
  generateMasterImportSQL();

  console.log('✓ SQL files generated successfully');
}

function generateChunkedSQL(tableName, data, columns) {
  const chunks = [];
  for (let i = 0; i < data.length; i += CONFIG.chunkSize) {
    chunks.push(data.slice(i, i + CONFIG.chunkSize));
  }

  chunks.forEach((chunk, index) => {
    const filename = `${String(index + 1).padStart(2, '0')}_${tableName}.sql`;
    const filepath = path.join(CONFIG.outputDir, filename);

    let sql = `-- ${tableName} seed data (chunk ${index + 1}/${chunks.length})\n\n`;

    if (chunk.length > 0) {
      sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;

      const values = chunk.map(row => {
        const vals = columns.map(col => {
          const val = row[col];
          if (val === null || val === 'NULL') return 'NULL';
          if (val === 'NOW()') return 'NOW()';
          if (typeof val === 'boolean') return val.toString();
          return `'${val}'`;
        });
        return `(${vals.join(', ')})`;
      });

      sql += values.join(',\n');
      sql += '\nON CONFLICT (id) DO NOTHING;\n';
    }

    fs.writeFileSync(filepath, sql);
    console.log(`  ✓ Generated ${filename} (${chunk.length} records)`);
  });
}

function generateLanguageRegionsSQL() {
  console.log('Generating language-region linkages...');

  const filename = '99_language_entities_regions.sql';
  const filepath = path.join(CONFIG.outputDir, filename);

  let sql = `-- Language-Region Linkages\n`;
  sql += `-- Links ROLV dialects to their countries via ISO country codes\n\n`;

  if (languageEntitiesRegions.length > 0) {
    // Group by country code for efficient processing
    const countryGroups = new Map();
    languageEntitiesRegions.forEach(ler => {
      if (!countryGroups.has(ler.country_code)) {
        countryGroups.set(ler.country_code, []);
      }
      countryGroups.get(ler.country_code).push(ler);
    });

    sql += `-- Insert language_entities_regions with country code resolution\n`;

    countryGroups.forEach((entries, countryCode) => {
      sql += `\n-- Link dialects to ${countryCode}\n`;
      sql += `INSERT INTO language_entities_regions (id, language_entity_id, region_id, dominance_level, created_at)\n`;
      sql += `SELECT \n`;
      sql += `  '${entries[0].id}'::uuid as id,\n`;
      sql += `  '${entries[0].language_entity_id}'::uuid as language_entity_id,\n`;
      sql += `  r.id as region_id,\n`;
      sql += `  ${entries[0].dominance_level} as dominance_level,\n`;
      sql += `  NOW() as created_at\n`;
      sql += `FROM regions r\n`;
      sql += `JOIN region_sources rs ON r.id = rs.region_id\n`;
      sql += `WHERE rs.external_id_type = 'iso3166-1-alpha2'\n`;
      sql += `  AND rs.external_id = '${countryCode}'\n`;
      sql += `  AND r.level = 'country'\n`;

      // Add additional entries for this country
      if (entries.length > 1) {
        sql += `UNION ALL\n`;
        for (let i = 1; i < entries.length; i++) {
          const entry = entries[i];
          sql += `SELECT \n`;
          sql += `  '${entry.id}'::uuid as id,\n`;
          sql += `  '${entry.language_entity_id}'::uuid as language_entity_id,\n`;
          sql += `  r.id as region_id,\n`;
          sql += `  ${entry.dominance_level} as dominance_level,\n`;
          sql += `  NOW() as created_at\n`;
          sql += `FROM regions r\n`;
          sql += `JOIN region_sources rs ON r.id = rs.region_id\n`;
          sql += `WHERE rs.external_id_type = 'iso3166-1-alpha2'\n`;
          sql += `  AND rs.external_id = '${countryCode}'\n`;
          sql += `  AND r.level = 'country'\n`;

          if (i < entries.length - 1) {
            sql += `UNION ALL\n`;
          }
        }
      }

      sql += `;\n`;
    });
  }

  fs.writeFileSync(filepath, sql);
  console.log(
    `  ✓ Generated ${filename} (${languageEntitiesRegions.length} region linkages)`
  );
}

function generateMasterImportSQL() {
  console.log('Generating master import script...');

  const filename = '00_import_all.sql';
  const filepath = path.join(CONFIG.outputDir, filename);

  let sql = `-- Master Language Import Script\n`;
  sql += `-- Generated from ISO 639-3 and ROLV data\n`;
  sql += `-- Run this file to import all language data in the correct order\n\n`;

  sql += `-- Begin transaction for atomic import\n`;
  sql += `BEGIN;\n\n`;

  sql += `-- Temporarily disable foreign key constraints for bulk loading\n`;
  sql += `SET session_replication_role = replica;\n\n`;

  // Calculate actual chunk counts
  const entitiesChunks = Math.ceil(languageEntities.length / CONFIG.chunkSize);
  const sourcesChunks = Math.ceil(
    languageEntitySources.length / CONFIG.chunkSize
  );
  const aliasesChunks = Math.ceil(languageAliases.length / CONFIG.chunkSize);
  const propertiesChunks = Math.ceil(
    languageProperties.length / CONFIG.chunkSize
  );

  sql += `-- Import language entities (${entitiesChunks} chunks)\n`;
  for (let i = 1; i <= entitiesChunks; i++) {
    const chunkFile = `${String(i).padStart(2, '0')}_language_entities.sql`;
    sql += `\\i supabase/seed/production/11_languages/${chunkFile}\n`;
  }

  sql += `\n-- Import language entity sources (${sourcesChunks} chunks)\n`;
  for (let i = 1; i <= sourcesChunks; i++) {
    const chunkFile = `${String(i).padStart(2, '0')}_language_entity_sources.sql`;
    sql += `\\i supabase/seed/production/11_languages/${chunkFile}\n`;
  }

  sql += `\n-- Import language aliases (${aliasesChunks} chunks)\n`;
  for (let i = 1; i <= aliasesChunks; i++) {
    const chunkFile = `${String(i).padStart(2, '0')}_language_aliases.sql`;
    sql += `\\i supabase/seed/production/11_languages/${chunkFile}\n`;
  }

  sql += `\n-- Import language properties (${propertiesChunks} chunks)\n`;
  for (let i = 1; i <= propertiesChunks; i++) {
    const chunkFile = `${String(i).padStart(2, '0')}_language_properties.sql`;
    sql += `\\i supabase/seed/production/11_languages/${chunkFile}\n`;
  }

  sql += `\n-- Import language-region linkages\n`;
  sql += `\\i supabase/seed/production/11_languages/99_language_entities_regions.sql\n\n`;

  sql += `-- Re-enable foreign key constraints\n`;
  sql += `SET session_replication_role = DEFAULT;\n\n`;

  sql += `-- Commit transaction\n`;
  sql += `COMMIT;\n\n`;

  sql += `-- Verification queries\n`;
  sql += `SELECT 'Language data import completed!' as status;\n\n`;

  sql += `-- Count summary\n`;
  sql += `SELECT \n`;
  sql += `  'language_entities' as table_name,\n`;
  sql += `  count(*) as total\n`;
  sql += `FROM language_entities\n`;
  sql += `UNION ALL\n`;
  sql += `SELECT 'language_entity_sources', count(*) FROM language_entity_sources\n`;
  sql += `UNION ALL\n`;
  sql += `SELECT 'language_aliases', count(*) FROM language_aliases\n`;
  sql += `UNION ALL\n`;
  sql += `SELECT 'language_properties', count(*) FROM language_properties\n`;
  sql += `UNION ALL\n`;
  sql += `SELECT 'language_entities_regions', count(*) FROM language_entities_regions;\n\n`;

  sql += `-- Level breakdown\n`;
  sql += `SELECT level, count(*) as count \n`;
  sql += `FROM language_entities \n`;
  sql += `GROUP BY level \n`;
  sql += `ORDER BY count DESC;\n\n`;

  sql += `-- Source breakdown\n`;
  sql += `SELECT source, external_id_type, count(*) as count \n`;
  sql += `FROM language_entity_sources \n`;
  sql += `GROUP BY source, external_id_type \n`;
  sql += `ORDER BY source, external_id_type;\n\n`;

  sql += `-- Region linkage sample\n`;
  sql += `SELECT \n`;
  sql += `  le.name as dialect_name,\n`;
  sql += `  r.name as country_name,\n`;
  sql += `  ler.dominance_level\n`;
  sql += `FROM language_entities_regions ler\n`;
  sql += `JOIN language_entities le ON le.id = ler.language_entity_id\n`;
  sql += `JOIN regions r ON r.id = ler.region_id\n`;
  sql += `WHERE le.level = 'dialect'\n`;
  sql += `LIMIT 10;\n`;

  fs.writeFileSync(filepath, sql);
  console.log(`  ✓ Generated ${filename} (master import script)`);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting language data seed generation...\n');

    // Process data files in dependency order
    processISO639Main();
    processISO639Macrolanguages();
    processISO639NameIndex();
    processROLVMain();
    processROLVAltNames();

    // Generate SQL output
    generateSQLFiles();

    console.log('\n🎉 Language seed generation completed successfully!');
    console.log(`\nGenerated files in: ${CONFIG.outputDir}`);
    console.log(`Total entities: ${languageEntities.length}`);
    console.log(`Total sources: ${languageEntitySources.length}`);
    console.log(`Total aliases: ${languageAliases.length}`);
    console.log(`Total properties: ${languageProperties.length}`);
    console.log(`Total region linkages: ${languageEntitiesRegions.length}`);
  } catch (error) {
    console.error('❌ Error during seed generation:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default {
  processISO639Main,
  processISO639Macrolanguages,
  processISO639NameIndex,
  processROLVMain,
  processROLVAltNames,
  generateSQLFiles,
};
