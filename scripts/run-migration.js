#!/usr/bin/env node
/**
 * Run Migration via Supabase Management API
 *
 * Usage:
 *   node scripts/run-migration.js <migration-file>
 *   node scripts/run-migration.js supabase/migrations/001_initial_schema.sql
 */

const path = require('path');
const { runMigrationFile } = require('./src/supabase-migrate');

async function main() {
  const args = process.argv.slice(2);

  if (!args[0]) {
    console.error('Usage: node scripts/run-migration.js <migration-file>');
    console.error('Example: node scripts/run-migration.js supabase/migrations/001_initial_schema.sql');
    process.exit(1);
  }

  const migrationPath = path.isAbsolute(args[0])
    ? args[0]
    : path.join(process.cwd(), args[0]);

  console.log('========================================');
  console.log('  Domainfolio Migration Runner');
  console.log('========================================\n');

  const result = await runMigrationFile(migrationPath, {
    delayMs: 200,
    stopOnError: false
  });

  console.log('========================================');
  console.log(`  Total: ${result.total}`);
  console.log(`  Successful: ${result.successful}`);
  console.log(`  Failed: ${result.failed}`);
  console.log('========================================');

  if (result.failed > 0) {
    console.log('\nErrors:');
    result.errors.slice(0, 5).forEach(e => console.log(`  - ${e.slice(0, 100)}`));
    if (result.errors.length > 5) {
      console.log(`  ... and ${result.errors.length - 5} more`);
    }
    process.exit(1);
  }

  console.log('\n✅ Migration completed successfully!');
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
