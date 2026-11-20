import { forwardRef, type ButtonHTMLAttributes } from 'react';

/*
 * Action button colour rules (Tailwind):
 *  primary    - charcoal, the main action of a group (New drillhole)
 *  import     - blue, data coming in
 *  save       - green, commit / success (green-700: white text meets 4.5:1)
 *  neutral    - white with a border; also the Export style (add <Icon name="download" />)
 *  ghost      - text only, for minor actions
 *  danger     - red, destructive
 *  iconDanger - quiet icon button that turns red on hover (row delete)
 * Use only one filled variant (primary, import, save, danger) per group of actions.
 * Hover colours use `enabled:` so a disabled button never changes on hover.
 */
export type ButtonVariant = 'primary' | 'import' | 'save' | 'neutral' | 'ghost' | 'danger' | 'iconDanger';
export type ButtonSize = 'md' | 'sm';

const BASE =
  // Border colour is set per variant (a shared border-transparent would win over border-gray-300 in Tailwind's output order).
  'inline-flex items-center justify-center gap-2 rounded-md border border-solid font-sans text-sm font-semibold ' +
  'whitespace-nowrap cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:h-4 [&_svg]:w-4';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-charcoal text-white enabled:hover:bg-charcoal-hover focus-visible:ring-charcoal',
  import: 'border-transparent bg-blue-600 text-white enabled:hover:bg-blue-700 focus-visible:ring-blue-500',
  save: 'border-transparent bg-green-700 text-white enabled:hover:bg-green-800 focus-visible:ring-green-600',
  neutral: 'bg-white text-gray-800 border-gray-300 enabled:hover:bg-gray-50 focus-visible:ring-gray-400',
  ghost: 'border-transparent bg-transparent text-gray-800 enabled:hover:bg-gray-100 focus-visible:ring-gray-400',
  danger: 'border-transparent bg-red-600 text-white enabled:hover:bg-red-700 focus-visible:ring-red-500',
  iconDanger:
    'bg-white text-gray-500 border-gray-300 enabled:hover:bg-red-50 enabled:hover:border-red-300 enabled:hover:text-red-600 ' +
    'focus-visible:text-red-600 focus-visible:ring-red-500',
};

const SIZES: Record<ButtonSize, string> = { md: 'h-control-md px-4 py-0', sm: 'h-control-sm px-3 py-0' };
const ICON_SIZES: Record<ButtonSize, string> = { md: 'h-control-md w-control-md p-0', sm: 'h-control-sm w-control-sm p-0' };

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size = 'md', className, type = 'button', ...rest }, ref) {
  const sizing = variant === 'iconDanger' ? ICON_SIZES[size] : SIZES[size];
  return <button ref={ref} type={type} className={[BASE, sizing, BUTTON_VARIANTS[variant], className].filter(Boolean).join(' ')} {...rest} />;
});
