import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title'> {
  icon: IconName;
  /** Accessible name and tooltip. */
  label: string;
}

/** Square icon-only button: the label is both its aria-label and its tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, className = '', type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} aria-label={label} title={label}
      className={'inline-flex h-control-md w-control-md flex-none cursor-pointer items-center justify-center rounded-md border border-solid border-gray-300 ' +
        'bg-white p-0 text-gray-700 transition-colors enabled:hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gblue/40 ' +
        `disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 ${className}`}
      {...rest}>
      <Icon name={icon} />
    </button>
  );
});
