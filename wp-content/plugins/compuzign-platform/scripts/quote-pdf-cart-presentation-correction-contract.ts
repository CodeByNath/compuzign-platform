// Contract: quote PDF + cart presentation correction
// (project-work/2026-09-06-quote-pdf-cart-presentation-correction.md).
// Proves the two user-reported live defects are fixed and stay fixed:
//   1. PDF/printable quote: only actual inclusion rows carry the ✓ marker —
//      period headings, payment-cycle facts, component notes/table labels,
//      and component totals must never carry it (source-scan against the
//      real cost-builder.css, since the ✓ itself is CSS ::before content,
//      not TS-rendered text — there is nothing for a DOM-free function test
//      to assert about a pseudo-element's content string).
//   2. Cart inclusion disclosure: a row under an additional Commercial Leg
//      group heading is indented (isChild/sectionKey are two independent,
//      stackable hierarchy dimensions — a Bundle child inside a section
//      carries BOTH, never collapsed into one), while Qty/Unit price/Line
//      total stay untouched so those columns remain aligned with the base
//      (unsectioned, non-child) rows.
// No change to cartBreakdown/commercialBreakdown derivation, Commercial Leg
// identity, quantities, unit prices, line totals, section subtotals, TCV,
// Initial Payment, quote ordering, or customer Upgrade Your Build flow —
// this contract proves presentation only, exercising the real
// disclosureRowsForFamilyTierItem()/breakdownInclusionRows() derivation
// (a pure function, real execution) plus source-scans of the CSS and JSX
// for the parts a function test cannot observe.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { disclosureRowsForFamilyTierItem } from '../resources/ts/components/cost-builder/InclusionDisclosure';
import type { FamilyTierQuoteItem } from '../resources/ts/components/cost-builder/types';
import type { QuotedBreakdownInclusion, QuotedCartBreakdown } from '../resources/ts/utils/paymentSummary';

const root = resolve(import.meta.dirname, '..');

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Quote PDF/cart presentation correction contract failed: ${message}`);
}

function familyItem(partial: Partial<FamilyTierQuoteItem>): FamilyTierQuoteItem {
  return {
    offer_type: 'family_tier',
    familyId: 'pcg_kairos',
    familyPlatformId: 'CZPG-KAIROS01',
    familyTitle: 'KAIROS',
    tierInstanceId: 'ti_kairos',
    tierInstancePlatformId: 'CZTG-KAIROS01',
    tierOccupantId: 'occ_basic',
    tierPlatformId: 'CZT-KAIROS001',
    tierEditionPlatformId: null,
    tierId: 'basic',
    tierTitle: 'KAIROS Basic',
    price: 11,
    billingCycle: 'monthly',
    features: ['Monitoring'],
    isAddon: false,
    minimumTermValue: null,
    minimumTermUnit: null,
    ...partial,
  };
}

function inclusion(partial: Partial<QuotedBreakdownInclusion> & { label: string }): QuotedBreakdownInclusion {
  return { quantity: 1, unitPrice: null, lineTotal: null, ...partial };
}

// ── 1. PDF marker semantics (source-scan) ────────────────────────────────

const cssPath = resolve(root, 'resources/css/modules/cost-builder.css');
const css = readFileSync(cssPath, 'utf8');

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.[\]]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  check(match !== null, `${selector} exists in cost-builder.css`);
  return match![1];
}

check(
  /content:\s*'✓'/.test(ruleBody('.cz-proposal__feature::before')),
  'the base .cz-proposal__feature::before still sets the ✓ marker — real inclusion rows keep it',
);

for (const modifier of ['--bundle', '--group', '--note', '--total']) {
  check(
    /content:\s*''/.test(ruleBody(`.cz-proposal__feature${modifier}::before`)),
    `.cz-proposal__feature${modifier}::before clears the ✓ marker — this row kind is not an inclusion`,
  );
}

// ── 2. Cart indentation — real derivation ────────────────────────────────

const baseBreakdown: QuotedCartBreakdown = {
  baseInclusions: [inclusion({ label: 'Managed Firewall', quantity: 1, lineTotal: 40 })],
  extensionGroups: [
    {
      billingCycle: 'annually',
      price: 80,
      heading: 'Extensions billed Annually',
      inclusions: [
        inclusion({
          label: 'Compliance Bundle',
          quantity: 1,
          lineTotal: 80,
          includes: [inclusion({ label: 'Compliance Bundle — Audit Log', quantity: 1, lineTotal: null })],
        }),
      ],
    },
  ],
};

const rows = disclosureRowsForFamilyTierItem(familyItem({ cartBreakdown: baseBreakdown }));
check(rows.length === 3, 'one base row + one extension parent row + one extension child row');

const [baseRow, extensionParentRow, extensionChildRow] = rows;
check(baseRow.label === 'Managed Firewall', 'the base inclusion is the first row');
check(baseRow.sectionKey === undefined && baseRow.isChild === false, 'a base (unsectioned, non-child) row carries neither hierarchy flag');

check(extensionParentRow.label === 'Compliance Bundle', 'the extension group\'s own Bundle parent is the second row');
check(extensionParentRow.sectionKey !== undefined, 'the extension parent row belongs to the additional Commercial Leg group section');
check(extensionParentRow.isChild === false, 'the extension parent row is not itself a Bundle child — only the section flag applies to it');

check(extensionChildRow.label === 'Compliance Bundle — Audit Log', 'the Bundle\'s own nested inclusion is the third row');
check(extensionChildRow.sectionKey === extensionParentRow.sectionKey, 'the Bundle child inherits the SAME section as its parent — one section, not a second one');
check(extensionChildRow.isChild === true, 'the Bundle child carries isChild — a hierarchy dimension independent of sectionKey, proving the two are never collapsed into one');

// The legacy inclusionItems fallback (pre-cartBreakdown cart entries) gets the same isChild treatment.
const legacyRows = disclosureRowsForFamilyTierItem(familyItem({
  cartBreakdown: null,
  inclusionItems: [
    {
      id: 'incl-1',
      label: 'Static IP Block',
      quantity: 2,
      line_total: 80,
      includes: [{ id: 'incl-1-child', label: 'Static IP Block — Reservation', quantity: 1, line_total: null }],
    },
  ] as FamilyTierQuoteItem['inclusionItems'],
}));
check(legacyRows.length === 2, 'the legacy inclusionItems fallback still produces one parent + one child row');
check(legacyRows[0].isChild === false && legacyRows[1].isChild === true, 'the legacy fallback marks its own nested child row isChild too, not just the cartBreakdown path');

// ── 3. Rendering: indentation applies to the label cell only (source-scan) ──

const inclusionDisclosureSource = readFileSync(
  resolve(root, 'resources/ts/components/cost-builder/InclusionDisclosure.tsx'),
  'utf8',
);

check(
  /cz-inclusion-disclosure__label--section/.test(inclusionDisclosureSource)
    && /cz-inclusion-disclosure__label--child/.test(inclusionDisclosureSource),
  'InclusionDisclosurePanel references both indent classes',
);

const panelRowMatch = inclusionDisclosureSource.match(
  /<tr key=\{row\.id\}>([\s\S]*?)<\/tr>,\s*\];/,
);
check(panelRowMatch !== null, 'the per-row <tr> block is found in InclusionDisclosurePanel');
const panelRowBody = panelRowMatch![1];
const cellMatches = [...panelRowBody.matchAll(/<td[^>]*>/g)];
check(cellMatches.length === 4, 'the row still renders exactly four cells — Inclusion, Qty, Unit price, Line total');
check(
  /cz-inclusion-disclosure__label--section|cz-inclusion-disclosure__label--child/.test(cellMatches[0][0])
    || /class=\{/.test(cellMatches[0][0]),
  'the FIRST cell (the label) is the one carrying the conditional indent class',
);
for (let i = 1; i < cellMatches.length; i++) {
  check(
    !/cz-inclusion-disclosure__label--/.test(cellMatches[i][0]),
    `cell ${i + 1} (Qty/Unit price/Line total) never carries an indent class — those columns stay aligned across every row`,
  );
}

// ── 4. CSS specificity: the compound (section+child) rule wins over either alone ──

check(
  css.includes('.cz-inclusion-disclosure__table td.cz-inclusion-disclosure__label--section.cz-inclusion-disclosure__label--child'),
  'a compound selector exists for a row that is both sectioned and a child — proving the two levels stack rather than collapse',
);

const sectionOnlyPadding = ruleBody('.cz-inclusion-disclosure__table td.cz-inclusion-disclosure__label--section');
const childOnlyPadding = ruleBody('.cz-inclusion-disclosure__table td.cz-inclusion-disclosure__label--child');
const compoundPadding = ruleBody(
  '.cz-inclusion-disclosure__table td.cz-inclusion-disclosure__label--section.cz-inclusion-disclosure__label--child',
);
check(/padding-left/.test(sectionOnlyPadding) && /padding-left/.test(childOnlyPadding) && /padding-left/.test(compoundPadding), 'all three rules set padding-left');
check(compoundPadding !== sectionOnlyPadding && compoundPadding !== childOnlyPadding, 'the compound rule uses a DIFFERENT (greater) indent than either level alone — a stacked, not collapsed, hierarchy');

console.log('Quote PDF/cart presentation correction contract passed.');
