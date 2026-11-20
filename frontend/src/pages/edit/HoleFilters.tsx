import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Select } from '../../components/Select';
import { useControlFrame } from '../../components/sheets';
import { LookupSelect } from '../../components/ui';

export interface Filters { search: string; status: string; purpose: string; target: string }
export const NO_FILTERS: Filters = { search: '', status: '', purpose: '', target: '' };

const STATUS_OPTIONS = [{ value: '', label: 'All' }, { value: 'PROJECT', label: 'PROJECT' }, { value: 'PROGRAM_TOVALIDATE', label: 'PROGRAM_TOVALIDATE' }];

/** Search and filters, fixed at the top of the sidebar. */
export function HoleFilters({ filters, onChange }: { filters: Filters; onChange: (filters: Filters) => void }) {
  const frame = useControlFrame();
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });
  return (
    <form role="search" className="flex flex-none flex-col gap-3 border-0 border-b border-solid border-gray-200 p-4" onSubmit={(e) => e.preventDefault()}>
      <label className="sa-field"><span className="sa-field__label">Search HOLEID</span>
        <span className={frame()}><Icon name="search" />
          <input type="search" placeholder="e.g. PZO_448" value={filters.search} className="!font-mono" onChange={(e) => set('search', e.target.value)} />
        </span>
      </label>
      <label className="sa-field"><span className="sa-field__label">Status</span>
        <Select label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={(v) => set('status', v)} />
      </label>
      <label className="sa-field"><span className="sa-field__label">Purpose</span>
        <LookupSelect id="L06" label="Purpose" value={filters.purpose || null} onChange={(v) => set('purpose', v ?? '')} />
      </label>
      <label className="sa-field"><span className="sa-field__label">Target</span>
        <LookupSelect id="L08" label="Target" value={filters.target || null} onChange={(v) => set('target', v ?? '')} />
      </label>
      <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange(NO_FILTERS)}>Clear filters</Button>
    </form>
  );
}
