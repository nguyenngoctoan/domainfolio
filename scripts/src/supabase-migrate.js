/**
 * Supabase Migration Utility
 *
 * Provides functions to run SQL migrations via the Supabase Management API.
 * Uses macOS keychain for authentication (stored by Supabase CLI).
 *
 * Usage:
 *   const { executeSQL, runMigration, runMigrationFile } = require('./src/supabase-migrate');
 *
 *   // Run a single SQL statement
 *   await executeSQL('CREATE TABLE foo (id UUID PRIMARY KEY);', 'Create foo table');
 *
 *   // Run multiple statements with rate limiting
 *   await runMigration([
 *     'CREATE TABLE foo (id UUID PRIMARY KEY);',
 *     'CREATE TABLE bar (id UUID PRIMARY KEY);',
 *   ]);
 *
 *   // Run a migration file
 *   await runMigrationFile('./migrations/001_initial.sql');
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'uykxgbrzpfswbdxtyzlv';
const API_BASE_URL = 'https://api.supabase.com/v1/projects';
const DEFAULT_SCHEMA = 'domainfolio';

// Rate limiting delay (ms) between API calls to avoid throttling
const DEFAULT_DELAY_MS = 300;

// Cached access token
let cachedAccessToken = null;

/**
 * Get access token from macOS keychain (stored by Supabase CLI)
 * Falls back to environment variable if keychain is unavailable
 */
function getAccessToken() {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  // Try environment variable first
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    cachedAccessToken = process.env.SUPABASE_ACCESS_TOKEN;
    return cachedAccessToken;
  }

  // Try macOS keychain
  try {
    const rawToken = execSync('security find-generic-password -s "Supabase CLI" -w 2>/dev/null', {
      encoding: 'utf-8'
    }).trim();

    // Handle base64-encoded token from go-keyring
    if (rawToken.startsWith('go-keyring-base64:')) {
      const base64Part = rawToken.replace('go-keyring-base64:', '');
      cachedAccessToken = Buffer.from(base64Part, 'base64').toString('utf-8');
    } else {
      cachedAccessToken = rawToken;
    }

    return cachedAccessToken;
  } catch (e) {
    throw new Error(
      'Could not get Supabase access token. Either:\n' +
      '  1. Run "supabase login" to authenticate\n' +
      '  2. Set SUPABASE_ACCESS_TOKEN environment variable'
    );
  }
}

/**
 * Delay helper for rate limiting
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute a single SQL statement via the Management API
 * @param {string} sql - SQL statement to execute
 * @param {string} [label] - Optional label for logging
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function executeSQL(sql, label = '') {
  const displayLabel = label || sql.slice(0, 50).replace(/\n/g, ' ') + (sql.length > 50 ? '...' : '');
  const accessToken = getAccessToken();

  try {
    const response = await fetch(`${API_BASE_URL}/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    });

    const text = await response.text();

    if (response.ok) {
      console.log(`✓ ${displayLabel}`);
      try {
        return { success: true, data: JSON.parse(text) };
      } catch {
        return { success: true, data: text };
      }
    } else {
      console.log(`✗ ${displayLabel}: ${text.slice(0, 150)}`);
      return { success: false, error: text };
    }
  } catch (error) {
    console.log(`✗ ${displayLabel}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Run multiple SQL statements with rate limiting
 * @param {string[]} statements - Array of SQL statements
 * @param {Object} [options] - Options
 * @param {number} [options.delayMs=300] - Delay between statements in ms
 * @param {boolean} [options.stopOnError=false] - Stop execution on first error
 * @param {boolean} [options.silent=false] - Suppress individual statement logs
 * @returns {Promise<{total: number, successful: number, failed: number, errors: string[]}>}
 */
async function runMigration(statements, options = {}) {
  const { delayMs = DEFAULT_DELAY_MS, stopOnError = false, silent = false } = options;

  if (!silent) {
    console.log(`\nRunning migration with ${statements.length} statements...\n`);
  }

  let successful = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt || stmt.startsWith('--')) continue;

    if (!silent) {
      console.log(`[${i + 1}/${statements.length}]`);
    }
    const result = await executeSQL(stmt);

    if (result.success) {
      successful++;
    } else {
      failed++;
      errors.push(`Statement ${i + 1}: ${result.error}`);
      if (stopOnError) {
        console.log('\nStopping due to error (stopOnError=true)');
        break;
      }
    }

    if (i < statements.length - 1) {
      await delay(delayMs);
    }
  }

  if (!silent) {
    console.log(`\n✅ Migration complete: ${successful} successful, ${failed} failed\n`);
  }

  return { total: statements.length, successful, failed, errors };
}

/**
 * Parse SQL file into individual statements
 * Handles multi-line statements, dollar-quoted strings, and comments
 * @param {string} sql - SQL content
 * @returns {string[]} Array of SQL statements
 */
function parseSQLStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and single-line comments when not in dollar quote
    if (!inDollarQuote && (!trimmed || trimmed.startsWith('--'))) {
      continue;
    }

    // Check for dollar quote start/end ($$)
    if (trimmed.includes('$$')) {
      const count = (trimmed.match(/\$\$/g) || []).length;
      if (count % 2 === 1) {
        inDollarQuote = !inDollarQuote;
      }
    }

    current += line + '\n';

    // If we're not in a dollar quote and line ends with semicolon, statement is complete
    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith('--')) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  // Add any remaining statement
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

/**
 * Run a migration from a SQL file
 * @param {string} filePath - Path to the SQL file
 * @param {Object} [options] - Options (same as runMigration)
 * @returns {Promise<{total: number, successful: number, failed: number, errors: string[]}>}
 */
async function runMigrationFile(filePath, options = {}) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  console.log(`\nReading migration file: ${absolutePath}`);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    return { total: 0, successful: 0, failed: 0, errors: ['File not found'] };
  }

  const sql = fs.readFileSync(absolutePath, 'utf8');
  console.log(`File size: ${(sql.length / 1024).toFixed(1)} KB`);

  const statements = parseSQLStatements(sql);
  console.log(`Parsed ${statements.length} statements`);

  return runMigration(statements, options);
}

/**
 * List all tables in a schema
 * @param {string} [schema='domainfolio'] - Schema name
 * @returns {Promise<string[]>} Array of table names
 */
async function listTables(schema = DEFAULT_SCHEMA) {
  const result = await executeSQL(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' ORDER BY table_name;`,
    `List tables in ${schema}`
  );

  if (result.success && Array.isArray(result.data)) {
    return result.data.map(row => row.table_name);
  }
  return [];
}

/**
 * List columns in a table
 * @param {string} tableName - Table name
 * @param {string} [schema='domainfolio'] - Schema name
 * @returns {Promise<Array<{name: string, type: string}>>}
 */
async function listColumns(tableName, schema = DEFAULT_SCHEMA) {
  const result = await executeSQL(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = '${schema}' AND table_name = '${tableName}'
     ORDER BY ordinal_position;`,
    `List columns in ${schema}.${tableName}`
  );

  if (result.success && Array.isArray(result.data)) {
    return result.data.map(row => ({ name: row.column_name, type: row.data_type }));
  }
  return [];
}

/**
 * Check if a table exists
 * @param {string} tableName - Table name
 * @param {string} [schema='domainfolio'] - Schema name
 * @returns {Promise<boolean>}
 */
async function tableExists(tableName, schema = DEFAULT_SCHEMA) {
  const result = await executeSQL(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = '${schema}' AND table_name = '${tableName}'
    );`,
    `Check if ${schema}.${tableName} exists`
  );

  return result.success && result.data?.[0]?.exists === true;
}

/**
 * Check if a column exists in a table
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @param {string} [schema='domainfolio'] - Schema name
 * @returns {Promise<boolean>}
 */
async function columnExists(tableName, columnName, schema = DEFAULT_SCHEMA) {
  const result = await executeSQL(
    `SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = '${schema}' AND table_name = '${tableName}' AND column_name = '${columnName}'
    );`,
    `Check if ${schema}.${tableName}.${columnName} exists`
  );

  return result.success && result.data?.[0]?.exists === true;
}

/**
 * Get row count for a table
 * @param {string} tableName - Table name
 * @param {string} [schema='domainfolio'] - Schema name
 * @returns {Promise<number>}
 */
async function getRowCount(tableName, schema = DEFAULT_SCHEMA) {
  const result = await executeSQL(
    `SELECT COUNT(*) as count FROM ${schema}.${tableName};`,
    `Count rows in ${schema}.${tableName}`
  );

  if (result.success && result.data?.[0]) {
    return parseInt(result.data[0].count, 10);
  }
  return -1;
}

/**
 * Clear the cached access token
 * Useful if token has expired and needs to be refreshed
 */
function clearTokenCache() {
  cachedAccessToken = null;
}

module.exports = {
  // Core functions
  executeSQL,
  runMigration,
  runMigrationFile,
  parseSQLStatements,
  delay,

  // Schema introspection
  listTables,
  listColumns,
  tableExists,
  columnExists,
  getRowCount,

  // Authentication
  getAccessToken,
  clearTokenCache,

  // Configuration
  PROJECT_REF,
  API_BASE_URL,
  DEFAULT_SCHEMA,
  DEFAULT_DELAY_MS,
};
