export type Tab = 'general' | 'construction' | 'gtn';

const TABS: [Tab, string][] = [['general', 'General'], ['construction', 'Drilling construction planned'], ['gtn', 'GTN panel']];

export function HoleTabs({ tab, onSelect }: { tab: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <div className="sa-tabs px-4 py-0" role="tablist">
      {TABS.map(([key, label]) => (
        <span key={key} className={tab === key ? 'is-active' : ''}>
          <button role="tab" aria-selected={tab === key} onClick={() => onSelect(key)}>{label}</button>
        </span>
      ))}
    </div>
  );
}
