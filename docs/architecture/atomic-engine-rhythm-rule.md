# Atomic Engine — Rhythm Rule

## The Law

All spatial values in the CompuZign design system must resolve to exact multiples of the rhythm unit.

```
--cz-rhythm: 4px
```

Every spacing value, padding, gap, radius, icon size, wrapper dimension, and layout measurement must be a 4px multiple. No random pixels. No arbitrary values invented outside this system.

---

## Element Families

The Atomic Engine is NOT a single universal physical scale.

It is a universal **contract language** applied across independent **element families**.

Each element family has its own **base identity** — its own physical size at the `base` contract level. Families do not share a base size. They share a contract shape.

| Family | Base identity | Meaning of `base` |
|---|---|---|
| Spacing | 16px (4 × rhythm) | Standard layout gap or padding unit |
| Heading | ~1.9rem fluid | Standard section heading |
| Button | ~15px/22px padding | Standard interactive button |
| Icon | 20px (5 × rhythm) | Standard inline icon |
| Wrapper | Module-specific | Standard content container |

These are not equal. They are independently born.

---

## Contract Language

Every family evolves through the same six named levels:

```
xs   — extra small
sm   — small
base — standard (the family's own identity)
md   — medium
lg   — large
xl   — extra large
```

This means:

```
Heading lg   = large heading    (not the same size as Button lg)
Button lg    = large button     (not the same size as Icon lg)
Icon lg      = large icon       (not the same size as Spacing lg)
Spacing lg   = 32px             (8 × rhythm)
```

The levels are **equal evolutionary positions** inside their own family. They are not equal physical dimensions across families.

---

## Spacing Family Contract

The spacing family is fully mapped to the rhythm unit.

| Contract level | Token | Numeric token | Rhythm units | Physical size |
|---|---|---|---|---|
| `xs` | `--cz-space-xs` | `--cz-space-1` | 1 × | 4px |
| `sm` | `--cz-space-sm` | `--cz-space-2` | 2 × | 8px |
| `base` | `--cz-space-base` | `--cz-space-4` | 4 × | 16px |
| `md` | `--cz-space-md` | `--cz-space-6` | 6 × | 24px |
| `lg` | `--cz-space-lg` | `--cz-space-8` | 8 × | 32px |
| `xl` | `--cz-space-xl` | `--cz-space-12` | 12 × | 48px |

The numeric tokens (`--cz-space-1` through `--cz-space-16`) remain available for fine-grained control when contract levels do not fit. Mid-values (`space-3`, `space-5`, `space-7`) are intentionally not assigned contract names — they signal a special case rather than a standard rhythm position.

---

## Composition Model

```
Token → Element → Module → Section → Page
```

- **Tokens** declare the raw values (colors, rhythm, spacing, radius, motion).
- **Elements** are born with identity (Button, Heading, Card, Badge, Icon).
- **Elements** evolve through the contract language (sm, base, lg).
- **Modules** compose elements (Hero, ServiceCard, QuoteSummary).
- **Sections** order modules (Homepage, Cost Builder).
- **Nothing** invents pixels or duplicate components outside this chain.

---

## Token Naming Convention

```
--cz-{family}-{property}-{level}
```

Examples:
```css
--cz-space-base       /* spacing family, base level */
--cz-space-lg         /* spacing family, lg level */
--cz-btn-padding-sm   /* button family, padding property, sm level (Phase 2) */
--cz-heading-size-xl  /* heading family, size property, xl level (Phase 2) */
--cz-icon-size-md     /* icon family, size property, md level (Phase 2) */
```

---

## Class Naming Convention

```
.cz-{element}                — base element
.cz-{element}--{level}       — size modifier (contract level)
.cz-{element}-{variant}      — color or style variant
.cz-{element}--{level}.cz-{element}-{variant}  — combined
```

Examples:
```html
<button class="cz-btn cz-btn-primary">Primary button (base)</button>
<button class="cz-btn cz-btn-primary cz-btn--lg">Large primary button</button>
<button class="cz-btn cz-btn-secondary cz-btn--sm">Small secondary button</button>
<span class="cz-badge cz-badge-accent">Accent badge</span>
<h2 class="cz-heading-lg">Large heading</h2>
```

---

## Anti-Patterns

These patterns are forbidden by the Rhythm Rule.

### Do not create duplicate components for visual size differences

```
// WRONG
BigButton
HeroButton
PricingButton
SidebarButton
SpecialButton

// RIGHT
Button + size modifier + variant + state
.cz-btn.cz-btn-primary.cz-btn--lg
```

### Do not invent arbitrary pixel values

```css
/* WRONG */
padding: 17px 23px;
margin-top: 13px;
gap: 11px;

/* RIGHT — must be a rhythm multiple */
padding: 16px 24px;   /* 4× and 6× rhythm */
margin-top: 12px;     /* 3× rhythm */
gap: 12px;            /* 3× rhythm */
```

### Do not create heading classes for individual content contexts

```
// WRONG
.cz-hero-title
.cz-pricing-card-heading
.cz-stats-number

// RIGHT
.cz-heading-xl        — large section heading
.cz-heading-lg        — section heading
.cz-heading-md        — subsection heading
```

Local component context is expressed through BEM elements, not new global primitives.

### Do not skip the contract language for one-off sizes

```
// WRONG
.cz-btn-very-large { padding: 22px 36px; }

// RIGHT
Request a new contract level (xl) if base/lg do not cover the use case.
```

---

## Rhythm Compliance — Current State (Phase 1)

| Family | Contract names | Values 4px-safe | Phase 2 target |
|---|---|---|---|
| Spacing | Yes (xs/sm/base/md/lg/xl added) | Yes (all tokens) | — complete |
| Heading | Partial (xl/lg/md/sm only, no base/xs) | No (clamp values not rhythm-safe) | Wire to heading tokens |
| Button | No size modifiers yet | No (15px/22px base not 4px-safe) | Add sm/base/lg modifiers |
| Icon | No family defined | — | Define icon token family |
| Radius | Named scale (sm/md/lg/xl/2xl/pill) | Yes (12/18/24/28/32px) | — complete |
| Motion | Named scale (fast/base/slow) | — (time values) | — complete |
| Color | Semantic names | — (color values) | — complete |

Items marked "complete" require no Phase 2 token work. Items without contract names or with non-rhythm-safe values are Phase 2 targets.

---

## Phase 2 Targets

These are the next formalizations after Phase 1 freeze lifts:

1. Add `--cz-heading-size-{xs..xl}` tokens and wire heading classes to them.
2. Add `--cz-btn-padding-{sm..lg}` tokens and `.cz-btn--sm / --lg` classes.
3. Add `--cz-icon-size-{xs..xl}` tokens and `.cz-icon` base class.
4. Align button base padding to rhythm-safe values (12px/24px or 16px/24px).
5. Align form field padding to rhythm-safe values.
6. Align chip/tab padding to rhythm-safe values.
7. Resolve `--cz-font-size-md` vs `--cz-font-size-base` naming ambiguity.
