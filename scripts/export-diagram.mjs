#!/usr/bin/env node
/**
 * Export a diagram from the diagram-engine app as a PNG or JPEG.
 *
 * Usage:
 *   node scripts/export-diagram.mjs --file <filename.json> [--format png|jpeg] [--output <path>]
 *
 * Examples:
 *   node scripts/export-diagram.mjs --file my-sequence.json
 *   node scripts/export-diagram.mjs --file my-sequence.json --format jpeg
 *   node scripts/export-diagram.mjs --file my-sequence.json --output exports/my-sequence.png
 *
 * Prerequisites:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *
 * The script will start the Vite dev server on port 5173 if it is not already
 * running. The server process is shut down automatically when the script exits.
 */

import { chromium } from '@playwright/test';
import { spawn, execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

const inputFile = getArg('--file');
const format = (getArg('--format') ?? 'png').toLowerCase();

if (!inputFile) {
  console.error('Error: --file <filename.json> is required.');
  process.exit(1);
}

if (format !== 'png' && format !== 'jpeg') {
  console.error('Error: --format must be "png" or "jpeg".');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Derive sidebar label from the filename stem (basename only) using the same
// algorithm as exampleRegistry.ts → humanizeFileStem (split on - or _,
// title-case each word).
const sidebarFilename = inputFile.split('/').pop() ?? inputFile;
const stem = sidebarFilename.replace(/\.json$/i, '');
const sidebarLabel = stem
  .split(/[-_]/g)
  .filter(Boolean)
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join(' ');

const defaultOutput = join(projectRoot, 'exports', `${stem}.${format}`);
const outputPath = resolve(getArg('--output') ?? defaultOutput);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether something is already listening on the Vite dev port.
 */
function isDevServerRunning(port = 5173) {
  try {
    execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Start the Vite dev server and return the child process.
 * Resolves when the server prints its "Local:" URL (ready to accept requests).
 */
function startDevServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'dev'], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    const onData = (chunk) => {
      const text = chunk.toString();
      if (text.includes('Local:')) {
        child.stdout.off('data', onData);
        resolve(child);
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.includes('Error') || text.includes('error')) {
        reject(new Error(`Dev server error: ${text.trim()}`));
      }
    });

    child.on('error', reject);

    // Bail out if the server hasn't started within 30 seconds.
    setTimeout(() => reject(new Error('Dev server did not start within 30 s.')), 30_000);
  });
}

/**
 * Ensure the output directory exists.
 */
function ensureOutputDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const port = 5173;
  const appUrl = `http://localhost:${port}`;
  let devServerProcess = null;

  // Verify the source file exists.
  const sourceFile = join(projectRoot, 'src', 'data', 'library', inputFile);
  if (!existsSync(sourceFile)) {
    console.error(`Error: File not found: ${sourceFile}`);
    console.error('Generate the diagram JSON first with /create-diagram, then re-run this script.');
    process.exit(1);
  }

  // Prefer the JSON's `name` field (it's what the sidebar actually shows).
  // Fall back to the title-cased filename stem if `name` is missing.
  let resolvedLabel = sidebarLabel;
  try {
    const parsed = JSON.parse(readFileSync(sourceFile, 'utf8'));
    if (parsed && typeof parsed.name === 'string' && parsed.name.trim().length > 0) {
      resolvedLabel = parsed.name.trim();
    }
  } catch {
    /* leave fallback */
  }

  // Start dev server if needed.
  if (!isDevServerRunning(port)) {
    console.log('Starting Vite dev server…');
    devServerProcess = await startDevServer();
    console.log(`Dev server ready at ${appUrl}`);
  } else {
    console.log(`Dev server already running at ${appUrl}`);
  }

  // Give the server a brief moment to settle.
  await new Promise((r) => setTimeout(r, 800));

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    console.log(`Opening ${appUrl}…`);
    await page.goto(appUrl, { waitUntil: 'networkidle' });

    // The app renders inside a SidebarProvider. Wait for the sidebar to appear.
    await page.waitForSelector('[data-slot="sidebar-menu-button"]', { timeout: 15_000 });

    // Expand every parent directory in the file path so the leaf becomes visible.
    // The sidebar uses Radix Collapsible; collapsed children are not in the
    // accessibility tree, so leaf buttons can't be found until parents expand.
    // Directory triggers don't carry data-slot (the asChild strips it), so we
    // find them via the wrapping <li data-slot="sidebar-menu-item">.
    const pathSegments = inputFile.split('/');
    const directorySegments = pathSegments.slice(0, -1);

    for (const segment of directorySegments) {
      await page.waitForTimeout(140);
      // The directory's button text matches the segment exactly. We use a
      // page.evaluate so we can locate, expand-state-check, and click in one go
      // — Playwright's filter+text-is selectors were missing the items.
      const expanded = await page.evaluate((seg) => {
        const items = Array.from(
          document.querySelectorAll('[data-slot="sidebar-menu-item"]'),
        );
        for (const item of items) {
          const span = item.querySelector('span');
          if (span && span.textContent && span.textContent.trim() === seg) {
            const button = item.querySelector('button');
            if (!button) return false;
            if (button.getAttribute('data-state') === 'open') return true;
            button.click();
            return true;
          }
        }
        return false;
      }, segment);

      if (!expanded) {
        console.warn(`Did not find directory item for segment "${segment}".`);
      }
      await page.waitForTimeout(220);
    }

    // Find and click the sidebar item matching the diagram label.
    console.log(`Selecting diagram "${sidebarFilename}" from the sidebar…`);

    const exactTargets = [resolvedLabel, sidebarFilename, sidebarLabel];
    let clicked = false;

    for (const targetName of exactTargets) {
      const menuButton = page.getByRole('button', { name: targetName, exact: true });
      if (await menuButton.count()) {
        await menuButton.first().click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      for (const targetText of exactTargets) {
        const fallback = page.locator('[data-slot="sidebar-menu-button"]').filter({
          hasText: targetText,
        });
        if (await fallback.count()) {
          await fallback.first().click();
          clicked = true;
          break;
        }
      }
    }

    if (!clicked) {
      // Dump leaf labels so it's clear what was visible at the moment of failure.
      const visibleLeaves = await page.evaluate(() => {
        const result = [];
        document
          .querySelectorAll('[data-slot="sidebar-menu-sub-button"]')
          .forEach((el) => result.push((el.textContent || '').trim()));
        return result;
      });
      throw new Error(
        `Could not find "${sidebarFilename}" / "${resolvedLabel}" / "${sidebarLabel}" in the sidebar. ` +
        `Visible leaves: ${JSON.stringify(visibleLeaves)}. ` +
        `Make sure the file "${inputFile}" exists in src/data/library/ and the app has reloaded.`,
      );
    }

    // Wait for the React Flow canvas to finish rendering.
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 });
    // Give animations a moment to settle.
    await new Promise((r) => setTimeout(r, 1_200));

    // Hide the React Flow zoom/maximize controls in the screenshot.
    await page.addStyleTag({
      content: `.react-flow__panel, .react-flow__controls, .react-flow__attribution { display: none !important; }`,
    });

    // Locate the preview panel and screenshot it.
    const previewPanel = page.locator('.preview-panel');
    await previewPanel.waitFor({ state: 'visible', timeout: 10_000 });

    ensureOutputDir(outputPath);

    if (format === 'jpeg') {
      await previewPanel.screenshot({ path: outputPath, type: 'jpeg', quality: 94 });
    } else {
      await previewPanel.screenshot({ path: outputPath, type: 'png' });
    }

    console.log(`\nExported ${format.toUpperCase()} → ${outputPath}`);
  } finally {
    await browser.close();

    if (devServerProcess) {
      console.log('Stopping dev server…');
      devServerProcess.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error(`\nExport failed: ${err.message}`);
  process.exit(1);
});
