import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const WalletIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z" />
    <path d="M3 10h18" />
    <circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
);

export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 6.5h12M8 12h12M8 17.5h12" />
    <circle cx="4.2" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4.2" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4.2" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
  </Icon>
);

export const ChartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 20V12M12 20V5M19 20v-5" />
  </Icon>
);

export const GearIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.7 6.7 5 5M19 19l-1.7-1.7M6.7 17.3 5 19M19 5l-1.7 1.7" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon strokeWidth={2.4} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon strokeWidth={2.4} {...p}>
    <path d="M4.5 12.5 9.5 17.5 19.5 7" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M14.5 5 8 12l6.5 7" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M9.5 5 16 12l-6.5 7" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.5 7l.8 11.3A1.8 1.8 0 0 0 9.1 20h5.8a1.8 1.8 0 0 0 1.8-1.7L17.5 7" />
    <path d="M10.5 11v5M13.5 11v5" />
  </Icon>
);

export const BackspaceIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5h9.5A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5H9L2.8 12.7a1 1 0 0 1 0-1.4L9 5Z" />
    <path d="M11.5 9.5l5 5M16.5 9.5l-5 5" />
  </Icon>
);

export const PiggyIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12.5c0-3.3 3.4-5.5 7.5-5.5 1.3 0 2.5.2 3.6.6l2.2-1.8v3.1c.9.8 1.5 1.8 1.7 2.9l1.5.6v2.8l-1.9.2c-.5 1-1.3 1.9-2.3 2.5V20h-2.6l-.5-1.3a12 12 0 0 1-2.4 0L10.3 20H7.7v-2.4C5.5 16.4 4 14.6 4 12.5Z" />
    <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3.5v3.5M16 3.5v3.5" />
  </Icon>
);

export const NoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4.5h9.5L19 9v10.5H5V4.5Z" />
    <path d="M14 4.5V9h5M8 13h8M8 16.5h5" />
  </Icon>
);

export const ArrowDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4.5v15M6 13.5l6 6 6-6" />
  </Icon>
);

export const ArrowUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19.5v-15M6 10.5l6-6 6 6" />
  </Icon>
);
