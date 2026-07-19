import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '../../../..');
const pluginRoot = path.resolve(scriptDir, '..');
const codeMapDir = path.join(repositoryRoot, 'docs/code-map');
const historyDir = path.join(repositoryRoot, 'docs/project-history');
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules', 'vendor']);
const failures = [];

async function collectMarkdownFiles(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(absolutePath);
    }
  }

  return files;
}

function repositoryPath(absolutePath) {
  return path.relative(repositoryRoot, absolutePath).split(path.sep).join('/');
}

function markdownLinks(markdown) {
  const links = [];
  const pattern = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;
  let match;

  while ((match = pattern.exec(markdown)) !== null) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '');
    const target = rawTarget.split(/\s+["']/)[0];
    links.push(target);
  }

  return links;
}

function inlineCurrentPaths(markdown) {
  const paths = [];
  const pattern = /`([^`]+)`/g;
  let match;

  while ((match = pattern.exec(markdown)) !== null) {
    const candidate = match[1].trim();
    if (/[*{}<>…]|\s|^@\//.test(candidate)) {
      continue;
    }
    if (/^(?:wp-content\/|docs\/|resources\/|src\/|scripts\/|tests\/|app\/|dist\/)/.test(candidate)
      || /^(?:AGENTS|CLAUDE)\.md$/.test(candidate)
      || candidate === 'vite.config.ts') {
      paths.push(candidate);
    }
  }

  return paths;
}

async function targetExists(sourceFile, target) {
  if (/^(?:[a-z][a-z+.-]*:|#)/i.test(target)) {
    return true;
  }

  const decodedTarget = decodeURIComponent(target.split('#')[0]);
  if (!decodedTarget) {
    return true;
  }

  const absoluteTarget = path.resolve(path.dirname(sourceFile), decodedTarget);
  const relativeTarget = path.relative(repositoryRoot, absoluteTarget);
  if (relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) {
    return false;
  }

  try {
    await stat(absoluteTarget);
    return true;
  } catch {
    return false;
  }
}

function countWords(markdown) {
  const withoutCode = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?(?:\[[^\]]*\])\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ');
  return withoutCode.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
}

const markdownFiles = await collectMarkdownFiles(repositoryRoot);
for (const file of markdownFiles) {
  const markdown = await readFile(file, 'utf8');
  for (const link of markdownLinks(markdown)) {
    if (!await targetExists(file, link)) {
      failures.push(`${repositoryPath(file)}: missing link target ${link}`);
    }
  }

  const isHistory = file.startsWith(`${historyDir}${path.sep}`);
  const isSupersededArchitecture = file.startsWith(`${path.join(repositoryRoot, 'docs/architecture')}${path.sep}`)
    && /^\*\*Status:\*\* (?:Historical|Superseded)/m.test(markdown);
  if (!isHistory && !isSupersededArchitecture) {
    for (const documentedPath of inlineCurrentPaths(markdown)) {
      const base = /^(?:resources|src|scripts|tests|app|dist)\//.test(documentedPath)
        || documentedPath === 'vite.config.ts'
        ? pluginRoot
        : repositoryRoot;
      try {
        await stat(path.resolve(base, documentedPath));
      } catch {
        failures.push(`${repositoryPath(file)}: missing documented path ${documentedPath}`);
      }
    }
  }
}

const codeMapFiles = (await readdir(codeMapDir))
  .filter((name) => name.endsWith('.md') && name !== '000-README.md')
  .sort();
const codeMapIndex = await readFile(path.join(codeMapDir, '000-README.md'), 'utf8');
const indexedMaps = markdownLinks(codeMapIndex)
  .map((target) => target.split('#')[0])
  .filter((target) => target.endsWith('.md') && target !== '../project-history/000-README.md');

for (const map of codeMapFiles) {
  const occurrences = indexedMaps.filter((entry) => entry === map).length;
  if (occurrences !== 1) {
    failures.push(`docs/code-map/000-README.md: ${map} is indexed ${occurrences} times`);
  }

  const contents = await readFile(path.join(codeMapDir, map), 'utf8');
  const wordCount = countWords(contents);
  if (wordCount > 600) {
    failures.push(`docs/code-map/${map}: ${wordCount} prose words exceeds the 600-word limit`);
  }
}

for (const indexedMap of indexedMaps) {
  if (!codeMapFiles.includes(indexedMap)) {
    failures.push(`docs/code-map/000-README.md: indexed map does not exist: ${indexedMap}`);
  }
}

const duplicateMaps = [...new Set(indexedMaps.filter((map, index) => indexedMaps.indexOf(map) !== index))];
for (const duplicate of duplicateMaps) {
  failures.push(`docs/code-map/000-README.md: duplicate entry ${duplicate}`);
}

const historyMarkdown = (await readdir(historyDir)).filter((name) => name.endsWith('.md'));
const allowedLegacyHistory = new Set(['000-README.md', 'PackageCategoryGroups-v1.md']);
for (const name of historyMarkdown) {
  if (!allowedLegacyHistory.has(name) && !/^\d{3}-.*\.md$/.test(name)) {
    failures.push(`docs/project-history: unnumbered history record ${name}`);
  }
}

const historyFiles = historyMarkdown
  .filter((name) => /^\d{3}-.*\.md$/.test(name) && name !== '000-README.md')
  .sort();
historyFiles.forEach((name, index) => {
  const expected = String(index + 1).padStart(3, '0');
  if (!name.startsWith(`${expected}-`)) {
    failures.push(`docs/project-history: expected ${expected}- milestone, found ${name}`);
  }
});

const requiredHierarchyLinks = new Map([
  ['AGENTS.md', ['docs/ai-index.md', 'docs/code-map/000-README.md', 'docs/project-history/000-README.md']],
  ['CLAUDE.md', ['AGENTS.md']],
  ['docs/ai-index.md', ['../AGENTS.md', 'code-map/000-README.md', 'project-history/000-README.md']],
]);
for (const [file, requiredLinks] of requiredHierarchyLinks) {
  const contents = await readFile(path.join(repositoryRoot, file), 'utf8');
  const links = markdownLinks(contents).map((target) => target.split('#')[0]);
  for (const requiredLink of requiredLinks) {
    if (!links.includes(requiredLink)) {
      failures.push(`${file}: missing hierarchy link ${requiredLink}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Documentation checks failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Documentation checks passed: ${markdownFiles.length} Markdown files, ${codeMapFiles.length} Code Maps, ${historyFiles.length} numbered history records.`);
