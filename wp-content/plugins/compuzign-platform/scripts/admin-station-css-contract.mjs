#!/usr/bin/env node
/**
 * Admin Station CSS contract.
 *
 * The field-system consolidation removed four parallel control families, a
 * duplicated control paint and ~20 dead selector families. This script is what
 * stops them growing back. It is deliberately four rules, not a linter.
 *
 * Specification: docs/architecture/admin-station-field-system-v1.md
 *
 * Run: npm run contract:admin-station-css
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.relative(pluginRoot, p);
const read = (p) => readFileSync(path.join(pluginRoot, p), 'utf8');
/** Comments carry prose about selectors and tokens; parse the CSS, not the prose. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

const SHELL_SHEETS = [
  'resources/ts/admin-station/styles/admin-station.css',
  'resources/ts/admin-station/styles/admin-station-responsive.css',
];
const TOKEN_SHEET = 'resources/ts/admin-station/styles/admin-station-tokens.css';
const DRAWER_SHEET = 'resources/css/modules/drawer-kit.css';
const ATOMIC_TOKENS = 'atomic-engine/css/00-tokens.css';
const ALL_SHEETS = [TOKEN_SHEET, ...SHELL_SHEETS, DRAWER_SHEET];

/**
 * Classes composed at runtime from a template literal, so their full name never
 * appears in source. Each entry must name the file that builds it. Keep this
 * list short: an entry is a promise that a component really does emit the class.
 */
const DYNAMIC_CLASSES = new Map([
  ['cz-station-drawer--wide', 'admin-station/shell/drawer/AdminStationDrawer.tsx'],
  ['cz-station-drawer--extra-wide', 'admin-station/shell/drawer/AdminStationDrawer.tsx'],
  ['cz-footer-split--danger', 'drawer-kit/EntityActionFooter.tsx'],
  ['cz-footer-split--secondary', 'drawer-kit/EntityActionFooter.tsx'],
  ['cz-service-stat__icon--accent', 'service-station/presentation/ServiceCatalogue.tsx'],
  ['cz-service-stat__icon--active', 'service-station/presentation/ServiceCatalogue.tsx'],
  ['cz-service-stat__icon--inactive', 'service-station/presentation/ServiceCatalogue.tsx'],
  ['cz-service-stat__icon--pending', 'service-station/presentation/ServiceCatalogue.tsx'],
  ['cz-tier-deck__button--destructive', 'package-station/presentation/package-tier-workspace'],
  ['is-error', 'admin-station status notification list'],
]);

/**
 * Properties that describe how a control looks. A feature stylesheet may lay a
 * control out; it may not paint one.
 */
const CONTROL_PROPERTIES = [
  'border', 'border-color', 'border-width', 'border-style', 'border-radius',
  'height', 'min-height', 'outline', 'box-shadow', 'background', 'background-color', 'color',
];

/** A selector that reaches a form control or a field class. */
const REACHES_CONTROL = /(^|[\s>+~(])(input|select|textarea|label)(?![\w-])|\.cz-tf-/;

/**
 * The one block allowed to paint controls. Everything between these markers in
 * the drawer sheet is the shared field system.
 */
const FIELD_BLOCK_START = '/* ── The Admin drawer field system';
const FIELD_BLOCK_END = '.cz-tf-footer {';

const failures = [];

/** Split a stylesheet into { selector, body, line } records. Media blocks are flattened. */
function rules(css) {
  const out = [];
  const source = stripComments(css);
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const selector = m[1].trim();
    if (!selector || selector.startsWith('@')) continue;
    out.push({
      selector,
      body: m[2],
      line: source.slice(0, m.index).split('\n').length,
    });
  }
  return out;
}

// ── Rule 1 — feature CSS may lay a control out, but may not paint one ────────
for (const sheet of SHELL_SHEETS) {
  for (const { selector, body, line } of rules(read(sheet))) {
    if (!REACHES_CONTROL.test(selector)) continue;
    for (const prop of CONTROL_PROPERTIES) {
      const declares = new RegExp(`(^|;|\\s)${prop}\\s*:`).test(body);
      if (declares) {
        failures.push(
          `${sheet}:${line}: '${selector}' declares '${prop}' on a control. ` +
          `Control appearance belongs to the field system in ${DRAWER_SHEET}.`,
        );
        break;
      }
    }
  }
}

// ── Rule 2 — the private --admin-* palette may shrink, never grow ────────────
// It is being retired in favour of the station tokens. The budget is what stops
// a new name being added to a palette on its way out.
const ADMIN_TOKEN_BUDGET = 37;
const adminTokens = new Set(read(DRAWER_SHEET).match(/^\s*(--admin-[a-z0-9-]+)\s*:/gm)?.map((s) => s.trim().replace(':', '')) ?? []);
if (adminTokens.size > ADMIN_TOKEN_BUDGET) {
  failures.push(
    `${DRAWER_SHEET}: ${adminTokens.size} --admin-* tokens defined, budget is ${ADMIN_TOKEN_BUDGET}. ` +
    `This palette is being retired — add station tokens in ${TOKEN_SHEET} instead.`,
  );
}
for (const sheet of [...SHELL_SHEETS, TOKEN_SHEET]) {
  const stray = read(sheet).match(/var\(--admin-[a-z0-9-]+/g);
  if (stray) {
    failures.push(`${sheet}: references the drawer kit's private palette (${[...new Set(stray)].join(', ')}).`);
  }
}

// ── Rule 3 — every class in the Admin Station sheets is emitted by something ──
function collectSource(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collectSource(full, acc);
    else if (/\.(ts|tsx|php)$/.test(entry)) acc.push(full);
  }
  return acc;
}
const sourceText = [
  ...collectSource(path.join(pluginRoot, 'resources/ts')),
  ...collectSource(path.join(pluginRoot, 'src')),
  ...collectSource(path.join(pluginRoot, 'app')),
].map((f) => readFileSync(f, 'utf8')).join('\n');
const sourceIdentifiers = new Set(sourceText.match(/[A-Za-z][A-Za-z0-9_-]*/g) ?? []);

const declaredClasses = new Set();
for (const sheet of ALL_SHEETS) {
  for (const cls of stripComments(read(sheet)).match(/\.[a-zA-Z][a-zA-Z0-9_-]*/g) ?? []) {
    declaredClasses.add(cls.slice(1));
  }
}
for (const cls of [...declaredClasses].sort()) {
  if (sourceIdentifiers.has(cls) || DYNAMIC_CLASSES.has(cls)) continue;
  failures.push(
    `'.${cls}' is styled but emitted by no TypeScript or PHP file. ` +
    `Delete the rule, or add the class to DYNAMIC_CLASSES naming the file that composes it.`,
  );
}

// ── Rule 4 — every var() reference resolves to a defined token ───────────────
const definedTokens = new Set();
for (const sheet of [TOKEN_SHEET, DRAWER_SHEET, ATOMIC_TOKENS]) {
  for (const decl of read(sheet).match(/^\s*(--[a-z0-9-]+)\s*:/gm) ?? []) {
    definedTokens.add(decl.trim().replace(':', ''));
  }
}
for (const sheet of ALL_SHEETS) {
  const css = read(sheet);
  for (const ref of new Set(css.match(/var\((--[a-z0-9-]+)/g) ?? [])) {
    const name = ref.replace('var(', '');
    if (!definedTokens.has(name)) {
      failures.push(`${sheet}: var(${name}) is referenced but defined nowhere.`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Admin Station CSS contract failed (${failures.length}):`);
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log(
  `Admin Station CSS contract passed: ${declaredClasses.size} classes, ` +
  `${definedTokens.size} tokens, ${adminTokens.size}/${ADMIN_TOKEN_BUDGET} --admin-* remaining.`,
);
