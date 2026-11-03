import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

// AMO answers 409 with "Version x.y.z already exists." That means this store
// already has the build. It must not fail the release or block other stores.
export function isAlreadyPublishedError(output) {
  return /already exists/i.test(output) && /409/.test(output);
}

export function classifySubmitResult(code, output) {
  if (code === 0) return { exitCode: 0, alreadyPublished: false };
  if (isAlreadyPublishedError(output)) return { exitCode: 0, alreadyPublished: true };
  return { exitCode: code ?? 1, alreadyPublished: false };
}

function storeLabel(args) {
  if (args.includes('--firefox-zip')) return 'Firefox Add-ons';
  if (args.includes('--chrome-zip')) return 'Chrome Web Store';
  return 'Store';
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

export function submitStore(args, spawnImpl = spawn) {
  return new Promise((resolve) => {
    const child = spawnImpl('npx', ['--no-install', 'wxt', 'submit', ...args], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });
    let output = '';
    let settled = false;

    const finish = (code) => {
      if (settled) return;
      settled = true;
      resolve(classifySubmitResult(code, output));
    };

    const collect = (chunk, stream) => {
      const text = chunk.toString();
      output += text;
      stream.write(text);
    };

    child.stdout?.on('data', (chunk) => collect(chunk, process.stdout));
    child.stderr?.on('data', (chunk) => collect(chunk, process.stderr));
    child.on('error', (err) => {
      process.stderr.write(`${err.message}\n`);
      finish(1);
    });
    child.on('close', (code) => finish(code));
  });
}

if (isDirectRun()) {
  const args = process.argv.slice(2).filter(Boolean);
  const result = await submitStore(args);
  if (result.alreadyPublished) {
    const store = storeLabel(args);
    process.stdout.write(
      `\n::warning::${store}: this version is already published. Continuing with the rest of the release.\n`,
    );
  }
  process.exit(result.exitCode);
}
