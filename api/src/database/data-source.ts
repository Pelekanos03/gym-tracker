import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source-options';

/**
 * For the TypeORM CLI (migration:generate / run / revert) — see the
 * "migration:*" scripts in package.json. Needs DATABASE_URL (Postgres).
 */
export default new DataSource(dataSourceOptions);
