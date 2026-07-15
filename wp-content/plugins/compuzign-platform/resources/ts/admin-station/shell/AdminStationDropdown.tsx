// A small, empty right-side dropdown surface.
//
// It intentionally has NO content — no rows, labels, account details, or
// actions. It exists only to establish anchored positioning, open/close
// behaviour (handled by the Header), and token-driven surface styling (border,
// radius, shadow, light/dark). It is anchored by CSS beneath its trigger inside
// a relatively-positioned control wrapper.

interface Props {
  id: string;
  labelledBy: string;
}

export function AdminStationDropdown({ id, labelledBy }: Props) {
  return <div id={id} class="cz-station-dropdown" role="menu" aria-labelledby={labelledBy} />;
}
