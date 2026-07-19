// Neutral shimmer placeholder for values that depend on an async fetch.
//
// Use to hold layout stable while authoritative data (e.g. adminDetail) is in
// flight, instead of rendering a value derived from a lightweight handoff that
// would flash/shift once the real value arrives. Sizing is caller-driven via
// width/height; the shimmer itself lives in .cz-skeleton (admin.css).

interface SkeletonProps {
  width?:  string;   // any CSS length — defaults to full line width
  height?: string;   // any CSS length — defaults to one text line
  radius?: string;   // override the shared --admin-radius corner
}

export function Skeleton({ width = '100%', height = '1em', radius }: SkeletonProps) {
  const style = `width:${width};height:${height}` + (radius ? `;border-radius:${radius}` : '');
  return <span class="cz-skeleton" style={style} aria-hidden="true" />;
}
