import type { ComponentType, SVGProps } from 'react';
import type { ServerSpaceIcon } from '@linuxpilot/server-contracts';
import {
  BackupIcon,
  CodeIcon,
  DatabasesIcon,
  DockerIcon,
  NetworkIcon,
  ServersIcon,
  ShieldIcon,
  UsersIcon,
} from '../dashboard/icons';

export const SPACE_ICON_COMPONENTS: Record<
  ServerSpaceIcon,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  server: ServersIcon,
  code: CodeIcon,
  container: DockerIcon,
  team: UsersIcon,
  shield: ShieldIcon,
  database: DatabasesIcon,
  network: NetworkIcon,
  backup: BackupIcon,
};

export function SpaceIcon({ icon, ...props }: { icon?: string | null } & SVGProps<SVGSVGElement>) {
  const key = icon && icon in SPACE_ICON_COMPONENTS ? (icon as ServerSpaceIcon) : 'server';
  const Icon = SPACE_ICON_COMPONENTS[key] ?? SPACE_ICON_COMPONENTS.server;
  return <Icon {...props} />;
}
