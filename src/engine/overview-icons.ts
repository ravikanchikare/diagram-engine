import {
  AlignLeft,
  CreditCard,
  Landmark,
  LayoutDashboard,
  MapPin,
  Monitor,
  Server,
  ShoppingBag,
  Terminal,
  User,
  Users,
} from 'lucide-react';
import {
  AvatarIcon,
  BoxIcon,
  ChatBubbleIcon,
  CodeIcon,
  CubeIcon,
  DashboardIcon,
  FileTextIcon,
  GearIcon,
  GlobeIcon,
  LayersIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  RocketIcon,
  TextAlignLeftIcon,
} from '@radix-ui/react-icons';
import type { ComponentType } from 'react';

export type OverviewIconSet = 'lucide' | 'radix';

// Glyph covers both Lucide (LucideProps) and Radix (IconProps with width/height)
// component shapes. We keep the typing permissive here and let the renderer
// (OverviewIconNode) pass the right props per icon set.
interface OverviewIconMeta {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Glyph: ComponentType<any>;
  label: string;
  iconSet: OverviewIconSet;
}

const DEFAULT_ICON_META: OverviewIconMeta = {
  Glyph: User,
  label: 'User',
  iconSet: 'lucide',
};

const LUCIDE_REGISTRY: Record<string, Omit<OverviewIconMeta, 'iconSet'>> = {
  account: { Glyph: Monitor, label: 'Connected account' },
  bank: { Glyph: Landmark, label: 'Bank' },
  'claude-code': { Glyph: Terminal, label: 'Claude Code' },
  client: { Glyph: User, label: 'Client' },
  customer: { Glyph: User, label: 'Customer' },
  'description-field': { Glyph: AlignLeft, label: 'Description Field' },
  finaccount: { Glyph: CreditCard, label: 'Financial account' },
  location: { Glyph: MapPin, label: 'Location' },
  platform: { Glyph: LayoutDashboard, label: 'Platform' },
  pos: { Glyph: ShoppingBag, label: 'Point of Sale' },
  server: { Glyph: Server, label: 'Server' },
  'sub-agent': { Glyph: Users, label: 'Sub-Agent' },
  terminal: { Glyph: Terminal, label: 'Terminal' },
  user: { Glyph: User, label: 'User' },
};

const RADIX_REGISTRY: Record<string, Omit<OverviewIconMeta, 'iconSet'>> = {
  api: { Glyph: BoxIcon, label: 'API' },
  browser: { Glyph: GlobeIcon, label: 'Browser' },
  'claude-code': { Glyph: CodeIcon, label: 'Claude Code' },
  client: { Glyph: PersonIcon, label: 'Client' },
  code: { Glyph: CodeIcon, label: 'Code' },
  customer: { Glyph: PersonIcon, label: 'Customer' },
  database: { Glyph: CubeIcon, label: 'Database' },
  'description-field': { Glyph: TextAlignLeftIcon, label: 'Description Field' },
  judge: { Glyph: MagnifyingGlassIcon, label: 'Judge' },
  lock: { Glyph: LockClosedIcon, label: 'Encrypted storage' },
  metric: { Glyph: DashboardIcon, label: 'Metric' },
  platform: { Glyph: DashboardIcon, label: 'Platform' },
  proxy: { Glyph: LayersIcon, label: 'Proxy' },
  rocket: { Glyph: RocketIcon, label: 'Rocket' },
  server: { Glyph: BoxIcon, label: 'Server' },
  service: { Glyph: GearIcon, label: 'Service' },
  sheet: { Glyph: FileTextIcon, label: 'Spreadsheet' },
  'sub-agent': { Glyph: AvatarIcon, label: 'Sub-Agent' },
  terminal: { Glyph: CodeIcon, label: 'Terminal' },
  thread: { Glyph: ChatBubbleIcon, label: 'Thread' },
  user: { Glyph: PersonIcon, label: 'User' },
};

export function humanizeOverviewIconName(icon: string) {
  return icon
    .replace(/^radix:/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function getOverviewIconMeta(icon: string): OverviewIconMeta {
  if (icon.startsWith('radix:')) {
    const key = icon.slice('radix:'.length);
    const entry = RADIX_REGISTRY[key];
    if (entry) return { ...entry, iconSet: 'radix' };
    return {
      ...DEFAULT_ICON_META,
      label: humanizeOverviewIconName(icon),
    };
  }

  const entry = LUCIDE_REGISTRY[icon];
  if (entry) return { ...entry, iconSet: 'lucide' };
  return {
    ...DEFAULT_ICON_META,
    label: humanizeOverviewIconName(icon),
  };
}
