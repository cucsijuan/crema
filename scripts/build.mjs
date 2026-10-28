// Builds dist/ for the native app: copies web/ and bundles the Bluetooth plugin.
import { cpSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

rmSync('dist', { recursive: true, force: true });
cpSync('web', 'dist', { recursive: true });
await build({
  entryPoints: ['native/ble-entry.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: 'dist/js/ble-native.js',
});
console.log('dist/ ready');
