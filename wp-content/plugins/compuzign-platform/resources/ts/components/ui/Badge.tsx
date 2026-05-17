import type { ComponentChildren } from 'preact';

type BadgeVariant = 'default' | 'accent' | 'success' | 'danger';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ComponentChildren;
}

const variantClass: Record<BadgeVariant, string> = {
  default:  'cz-badge',
  accent:   'cz-badge cz-badge-accent',
  success:  'cz-badge cz-badge-success',
  danger:   'cz-badge cz-badge-danger',
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return <span class={variantClass[variant]}>{children}</span>;
}
