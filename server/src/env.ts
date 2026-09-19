import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/**
 * Must be imported before anything that reads process.env at module scope —
 * ES imports are hoisted, so loading these inside another module's body is
 * already too late.
 *
 * server/.env holds the Stripe key; the repo-root .env is what `stripe projects`
 * writes provider credentials into. Neither overrides a var that is already set,
 * so real environment variables always win in production.
 */
const here = dirname(fileURLToPath(import.meta.url));

dotenv.config();
dotenv.config({ path: resolve(here, '../.env') });
dotenv.config({ path: resolve(here, '../../.env') });
