import type { ComponentChildren } from 'preact';

interface CardProps {
  soft?: boolean;
  class?: string;
  children: ComponentChildren;
}

export function Card({ soft = false, class: extraClass = '', children }: CardProps) {
  const cls = ['cz-card', soft && 'cz-card-soft', extraClass].filter(Boolean).join(' ');
  return <div class={cls}>{children}</div>;
}
