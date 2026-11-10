import { sequelize } from '../models';

/**
 * Creates/updates tables from the models.
 *   npm run db:sync    -> create missing tables
 *   npm run db:reset   -> DROP and recreate everything (development only!)
 */
async function main() {
  const force = process.argv.includes('--force');
  const alter = process.argv.includes('--alter');
  await sequelize.sync({ force, alter });
  console.log(`Database synced${force ? ' (reset)' : alter ? ' (altered)' : ''}.`);
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
