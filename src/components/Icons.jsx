const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const CopyIcon = (p) => (
  <svg {...base} {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
)
export const CheckIcon = (p) => (
  <svg {...base} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)
export const BoltIcon = (p) => (
  <svg {...base} {...p}><path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" /></svg>
)
export const SearchIcon = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
)
export const WrenchIcon = (p) => (
  <svg {...base} {...p}><path d="M14.5 6.5a4 4 0 0 0 4.9 4.9l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-1.9-1.9Z" /></svg>
)
export const ShieldIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3 5 6v5.5c0 4.3 2.9 7.6 7 9.5 4.1-1.9 7-5.2 7-9.5V6l-7-3Z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>
)
export const ClockIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
)
export const TrashIcon = (p) => (
  <svg {...base} {...p}><path d="M4 7h16M10 7V4.5h4V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" /></svg>
)
export const AlertIcon = (p) => (
  <svg {...base} {...p}><path d="M12 4 3 19.5h18L12 4Z" /><path d="M12 10v4.5M12 17.2v.1" /></svg>
)
export const DownloadIcon = (p) => (
  <svg {...base} {...p}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 19.5h14" /></svg>
)
export const GridIcon = (p) => (
  <svg {...base} {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
)
export const ListIcon = (p) => (
  <svg {...base} {...p}><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.8" cy="6.5" r="1" /><circle cx="4.8" cy="12" r="1" /><circle cx="4.8" cy="17.5" r="1" /></svg>
)
export const GearIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" /></svg>
)
export const ArrowLeftIcon = (p) => (
  <svg {...base} {...p}><path d="M19 12H5m0 0 6-6m-6 6 6 6" /></svg>
)
export const ChevronIcon = (p) => (
  <svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>
)
export const PlusIcon = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
)
