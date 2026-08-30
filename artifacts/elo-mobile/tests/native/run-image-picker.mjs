import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const platform = process.argv[2] ?? process.env.NATIVE_PLATFORM;
const allowedPlatforms = new Set(['android', 'ios']);
if (!allowedPlatforms.has(platform)) {
  console.error(
    'Uso: pnpm run test:native:image-picker -- <android|ios> (ou NATIVE_PLATFORM)',
  );
  process.exit(2);
}

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const flowFile = path.join(testsDirectory, `image-picker.${platform}.yaml`);
const appId = process.env.ELO_APP_ID || 'com.elo.mobile';

function run(command, args, label) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    throw new Error(
      `${label} não encontrado. Instale/configure ${command} e tente novamente.`,
    );
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(
  process.execPath,
  [path.join(testsDirectory, 'prepare-image-fixtures.mjs'), platform],
  'Preparador de imagens',
);
run(
  'maestro',
  ['test', '--no-ansi', '--env', `ELO_APP_ID=${appId}`, flowFile],
  'Maestro',
);