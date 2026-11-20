import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Button } from './Button';
import { Icon } from './Icon';

export type ExportItem =
  | { label: string; hint: string; href: string }
  | { label: string; hint: string; onSelect: () => void };

const PANEL =
  'z-50 min-w-56 max-w-sm overflow-auto rounded-md border border-solid border-gray-200 bg-white py-1 shadow-lg outline-none [--anchor-gap:4px]';
const ROW =
  'flex min-h-8 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-1.5 text-left font-sans text-sm text-gray-900 no-underline ' +
  'data-[focus]:bg-sheet-hover [&_svg]:h-4 [&_svg]:w-4 [&_svg]:flex-none [&_svg]:text-gray-600';

/**
 * "Export Excel ▾" (neutral outline button) with its downloads. Headless UI Menu: Enter, Space or
 * the arrow keys open it, the arrows move, Enter picks, Esc closes.
 */
export function ExportMenu({ items }: { items: ExportItem[] }) {
  return (
    <Menu>
      <MenuButton as={Button} variant="neutral"><Icon name="download" />Export Excel<Icon name="chevron" /></MenuButton>
      <MenuItems anchor="bottom end" className={PANEL}>
        {items.map((item) => {
          const content = (
            <>
              <Icon name="download" />
              <span className="flex min-w-0 flex-col"><span>{item.label}</span><span className="text-xs text-gray-500">{item.hint}</span></span>
            </>
          );
          return 'href' in item
            ? <MenuItem key={item.label} as="a" href={item.href} className={ROW}>{content}</MenuItem>
            : <MenuItem key={item.label} as="button" type="button" onClick={item.onSelect} className={ROW}>{content}</MenuItem>;
        })}
      </MenuItems>
    </Menu>
  );
}
