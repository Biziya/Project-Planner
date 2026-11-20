import type { ButtonHTMLAttributes } from 'react';
import { Button, type ButtonSize, type ButtonVariant } from '../Button';
import { useSheetsLook } from '../sheets';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant: ButtonVariant; legacy: string; size?: ButtonSize };

/** Edit page: the Tailwind Button (colour rules). Import page pop-up: the design-system button with the `legacy` class, as before. */
export function ActionButton({ variant, legacy, size = 'md', ...rest }: ActionButtonProps) {
  const sheets = useSheetsLook();
  if (sheets) return <Button variant={variant} size={size} {...rest} />;
  return <button className={`sa-btn ${legacy}${size === 'sm' ? ' sa-btn--sm' : ''}`} {...rest} />;
}
