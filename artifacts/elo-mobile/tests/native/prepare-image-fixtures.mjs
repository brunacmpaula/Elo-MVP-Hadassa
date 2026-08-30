import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const platform = process.argv[2];
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceImage = path.join(appRoot, 'assets/images/icon.png');
const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'elo-native-images-'));
const fixtureFiles = Array.from({ length: 5 }, (_, index) => {
  const file = path.join(fixtureDirectory, `elo-native-image-${index + 1}.png`);
  fs.copyFileSync(sourceImage, file);
  return file;
});

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const details = error?.stderr?.toString().trim();
    throw new Error(
      `Não foi possível preparar a galeria com ${command}: ${details || error.message}`,
    );
  }
}

if (platform === 'android') {
  run('adb', ['get-state']);
  const remoteDirectory = '/sdcard/Pictures/elo-native-image-picker';
  run('adb', ['shell', 'mkdir', '-p', remoteDirectory]);
  for (const fixtureFile of fixtureFiles) {
    const remoteFile = `${remoteDirectory}/${path.basename(fixtureFile)}`;
    run('adb', ['push', fixtureFile, remoteFile]);
    run('adb', [
      'shell',
      'am',
      'broadcast',
      '-a',
      'android.intent.action.MEDIA_SCANNER_SCAN_FILE',
      '-d',
      `file://${remoteFile}`,
    ]);
  }
} else if (platform === 'ios') {
  run('xcrun', ['simctl', 'addmedia', 'booted', ...fixtureFiles]);
} else {
  throw new Error('Plataforma inválida. Use "android" ou "ios".');
}

console.log(`Cinco imagens de teste adicionadas à galeria (${platform}).`);