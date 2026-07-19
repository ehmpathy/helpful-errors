import pkg from '../package.json';

/**
 * .what = the runtime version of this helpful-errors copy, read from its package.json
 * .why =
 *   - the brand stamp needs the package version at runtime so callers can version-gate
 *   - a direct package.json import (resolveJsonModule) needs no codegen step; at runtime
 *     dist/version.js resolves `../package.json` to this package's own manifest
 *   - mirrors the domain-objects convention (src/instantiation/version.ts imports pkg)
 */
export const version: string = pkg.version;
