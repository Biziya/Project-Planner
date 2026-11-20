// 16 px stroke icons
const paths = {
  list: 'M2.5 4h11M2.5 8h11M2.5 12h11',
  download: 'M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10',
  plus: 'M8 3v10M3 8h10',
  close: 'M4 4l8 8M12 4l-8 8',
  check: 'M3 8.5l3 3 7-7',
  search: 'M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.5 10.5L14 14',
  chevron: 'M4 6l4 4 4-4',
  send: 'M2.5 8h9M8 4.5L11.5 8 8 11.5M13.5 3v10',
  trash: 'M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8.5h5l.5-8.5',
  lock: 'M3.5 7h9v6.5h-9zM5.5 7V5.5a2.5 2.5 0 0 1 5 0V7',
  chevronsLeft: 'M8 4L4 8l4 4M12.5 4l-4 4 4 4',
  chevronsRight: 'M8 4l4 4-4 4M3.5 4l4 4-4 4',
  checkCircle: 'M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5zM5.25 8.25l1.9 1.9 3.6-3.9',
  alertCircle: 'M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5zM8 4.75v4M8 11v.25',
  alertTriangle: 'M8 2l6.5 11.5h-13zM8 6.25v3.5M8 11.75V12',
  info: 'M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5zM8 7.25v4M8 4.75V5',
  help:'M5.5 5.75a2.5 2.5 0 1 1 3.6 2.25c-.7.35-1.1.9-1.1 1.6v.75M8 12.5v.25',
};

export type IconName = keyof typeof paths;

export const Icon = ({ name }: { name: IconName }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>
);
