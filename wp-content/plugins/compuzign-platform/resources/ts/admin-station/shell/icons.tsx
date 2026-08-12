// Admin Station icon set.
//
// Uses the repository's existing SVG icon system — Heroicons v2 solid, 24×24
// viewBox, `currentColor` — so glyphs match the rest of the platform. Kept
// local to the new Admin Station tree (no import from the old admin) so this
// environment stays independent. The three Station glyphs (Services, Packages,
// Promotions) reuse the exact path data of the repository's `catalog`,
// `package`, and `featured` nav glyphs.
//
// No emoji, external icon packages, image icons, or improvised shapes.

import type { ComponentType, ComponentChildren } from 'preact';

type IconProps = { class?: string };

function Icon({ class: className, children }: IconProps & { children: ComponentChildren }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      class={`cz-station-icon${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// Bars-3 — the slide-menu trigger.
export const MenuIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
  </Icon>
);

// Squares 2×2 (repo `catalog`) — Services.
export const ServicesIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" clipRule="evenodd" />
  </Icon>
);

// Tag — Service Categories.
export const CategoriesIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39 1.186 3.548.428a18.849 18.849 0 005.441-5.44c.758-1.16.492-2.63-.428-3.55l-9.58-9.58a3 3 0 00-2.122-.879H5.25zM6.375 7.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" clipRule="evenodd" />
  </Icon>
);

// Table cells — Rate Sheet rows / Inclusions.
export const RateSheetIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M3.75 3A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H3.75zM3 9h5.25V4.5h-4.5A.75.75 0 003 5.25V9zm6.75-4.5V9H21V5.25a.75.75 0 00-.75-.75H9.75zM21 10.5H9.75v4.25H21V10.5zm0 5.75H9.75v3.25h10.5a.75.75 0 00.75-.75v-2.5zm-12.75 3.25v-3.25H3v2.5c0 .414.336.75.75.75h4.5zM3 14.75h5.25V10.5H3v4.25z" clipRule="evenodd" />
  </Icon>
);

// Stacked layers — Tiers.
export const TiersIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M11.644 1.59a.75.75 0 01.712 0l9 4.875a.75.75 0 010 1.32l-9 4.875a.75.75 0 01-.712 0l-9-4.875a.75.75 0 010-1.32l9-4.875z" />
    <path d="M2.25 12.525a.75.75 0 011.106-.66L12 16.548l8.644-4.683a.75.75 0 11.712 1.32l-9 4.875a.75.75 0 01-.712 0l-9-4.875a.75.75 0 01-.394-.66z" />
    <path d="M2.25 17.4a.75.75 0 011.106-.66L12 21.423l8.644-4.683a.75.75 0 11.712 1.32l-9 4.875a.75.75 0 01-.712 0l-9-4.875a.75.75 0 01-.394-.66z" />
  </Icon>
);

// Cube (repo `package`) — Packages.
export const PackagesIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12.378 1.602a.75.75 0 00-.756 0L3.366 6.39a.75.75 0 000 1.298l8.256 4.768a.75.75 0 00.756 0l8.256-4.768a.75.75 0 000-1.298L12.378 1.602zM3 9.46v7.788a.75.75 0 00.378.65l8.25 4.764V13.41L3 9.46zm9.75 13.452l8.25-4.764a.75.75 0 00.378-.65V9.46l-8.628 4.984v8.468z" />
  </Icon>
);

// Star (repo `featured`) — Promotions.
export const PromotionsIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </Icon>
);

// Sun — shown when the dark theme is active (click to go light).
export const SunIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
  </Icon>
);

// Moon — shown when the light theme is active (click to go dark).
export const MoonIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
  </Icon>
);

// Squares 2×2 (rounded) — the secondary apps/menu control.
export const AppsIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M2.25 6a3.75 3.75 0 013.75-3.75h1.5A3.75 3.75 0 0111.25 6v1.5A3.75 3.75 0 017.5 11.25H6A3.75 3.75 0 012.25 7.5V6zm10.5 0A3.75 3.75 0 0116.5 2.25H18A3.75 3.75 0 0121.75 6v1.5A3.75 3.75 0 0118 11.25h-1.5A3.75 3.75 0 0112.75 7.5V6zM2.25 16.5A3.75 3.75 0 016 12.75h1.5a3.75 3.75 0 013.75 3.75V18A3.75 3.75 0 017.5 21.75H6A3.75 3.75 0 012.25 18v-1.5zm10.5 0a3.75 3.75 0 013.75-3.75H18a3.75 3.75 0 013.75 3.75V18A3.75 3.75 0 0118 21.75h-1.5A3.75 3.75 0 0112.75 18v-1.5z" clipRule="evenodd" />
  </Icon>
);

// User circle — the user profile control.
export const UserIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
  </Icon>
);

// Chevron-down — the split action's menu trigger.
export const ChevronDownIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
  </Icon>
);

// Chevron-right — a trailing "read more" indicator for a card action.
export const ChevronRightIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 010-1.06z" clipRule="evenodd" />
  </Icon>
);

// Eye — the default `View` primary action.
export const ViewIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
  </Icon>
);

// Magnifying glass — browse/search controls.
export const SearchIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.94 4.94a.75.75 0 11-1.06 1.06l-4.94-4.94A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
  </Icon>
);

// Check-circle — a positive/active status glyph.
export const CheckCircleIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </Icon>
);

// Pencil-square — an editable/draft-document glyph.
export const PencilSquareIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
    <path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" />
  </Icon>
);

// Archive-box — a stored/inactive-record glyph.
export const ArchiveBoxIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
    <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
  </Icon>
);

// Trash — the Edition Bin's nav control (Tier Options secondary nav trailing
// icon) and its row-level destructive action (move to trash / permanently
// delete, depending on the row's own status — see TierEditionBinList.tsx).
export const TrashIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
  </Icon>
);

// Arrow-uturn-left — the Edition Bin row's Restore action.
export const RestoreIcon: ComponentType<IconProps> = (props) => (
  <Icon {...props}>
    <path fillRule="evenodd" d="M9.53 2.47a.75.75 0 010 1.06L4.81 8.25H15a6.75 6.75 0 010 13.5h-3a.75.75 0 010-1.5h3a5.25 5.25 0 100-10.5H4.81l4.72 4.72a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z" clipRule="evenodd" />
  </Icon>
);
