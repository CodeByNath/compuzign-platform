import type { ComponentChildren } from 'preact';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  class?: string;
  children: ComponentChildren;
}

export function Button({
  variant = 'primary',
  onClick,
  disabled = false,
  type = 'button',
  class: extraClass = '',
  children,
}: ButtonProps) {
  const cls = ['cz-btn', `cz-btn-${variant}`, extraClass].filter(Boolean).join(' ');
  return (
    <button type={type} class={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
