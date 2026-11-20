import type { HoleSummary } from '../../api/api';
import { ID_LINK } from '../../components/sheets';
import { StatusChip } from '../../components/ui';

interface HoleListProps { holes: HoleSummary[]; isLoading: boolean; selectedId: string | null; onOpen: (holeId: string) => void }

/** Hole table; scrolls on its own under the filters. Selected row: light blue with a 2 px blue left edge. */
export function HoleList({ holes, isLoading, selectedId, onOpen }: HoleListProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <p className="m-0 px-4 py-2 font-sans text-xs text-gray-500">{isLoading ? 'Loading…' : `${holes.length} holes`}</p>
      <table className="sa-table">
        <thead><tr><th className="is-sorted">HOLEID <span className="sort !text-gblue">↑</span></th><th>Status</th></tr></thead>
        <tbody>
          {holes.map((h) => {
            const isSelected = h.holeId === selectedId;
            const cell = isSelected ? 'bg-gblue-light' : 'group-hover:bg-sheet-hover';
            return (
              <tr key={h.holeId} className="group">
                <td className={`id ${cell} ${isSelected ? 'shadow-[inset_2px_0_0_theme(colors.gblue.DEFAULT)]' : ''}`}>
                  <button className={ID_LINK} aria-current={isSelected} onClick={() => onOpen(h.holeId)}>{h.holeId}</button>
                </td>
                <td className={cell}><StatusChip status={h.status} short /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!isLoading && holes.length === 0 && <p className="sa-muted m-0 p-6 text-center">No hole matches these filters. Clear filters to see them all.</p>}
    </div>
  );
}
