import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getAllPhosphorNames } from '../assets/js/icon-mapping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PHOSPHOR_DIR = join(__dirname, '../node_modules/@phosphor-icons/core/assets/regular');
const OUTPUT_FILE = join(__dirname, '../assets/js/phosphor-icons.js');

function stripSvgRoot(svg) {
  // Remove xmlns, width, height, fill attributes on the root svg tag
  return svg
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .replace(/fill="#000000"/g, 'fill="currentColor"')
    .replace(/stroke="#000000"/g, 'stroke="currentColor"')
    .replace(/#000000/g, 'currentColor')
    .trim();
}

function extractViewBox(svg) {
  const match = svg.match(/viewBox="([^"]+)"/);
  return match ? match[1] : '0 0 256 256';
}

async function build() {
  const names = getAllPhosphorNames();
  const icons = {};

  for (const name of names) {
    const filePath = join(PHOSPHOR_DIR, `${name}.svg`);
    try {
      const svg = await readFile(filePath, 'utf-8');
      icons[name] = {
        viewBox: extractViewBox(svg),
        content: stripSvgRoot(svg),
      };
    } catch (err) {
      console.error(`Failed to read icon: ${name}.svg`, err.message);
      process.exit(1);
    }
  }

  const entries = Object.entries(icons)
    .map(([name, data]) => {
      return `  '${name}': {
    viewBox: '${data.viewBox}',
    content: \`${data.content}\`,
  }`;
    })
    .join(',\n');

  const output = `/**
 * 由 scripts/build-icon-sprite.js 自动生成
 * 源：@phosphor-icons/core/assets/regular
 * 请勿手动编辑
 */

export const PHOSPHOR_ICONS = {\n${entries}\n};
`;

  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, output, 'utf-8');

  console.log(`Generated ${Object.keys(icons).length} icons -> ${OUTPUT_FILE}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
