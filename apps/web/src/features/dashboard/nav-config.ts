import type { ComponentType, SVGProps } from 'react';
import { PERMISSIONS, type PermissionCode } from '@linuxpilot/auth-contracts';
import {
  BellIcon,
  DatabasesIcon,
  DockerIcon,
  FilesIcon,
  MonitoringIcon,
  ServersIcon,
  SettingsIcon,
  TerminalIcon,
  UsersIcon,
} from './icons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export type NavLeaf = {
  id: string;
  labelKey:
    | 'allServers'
    | 'groups'
    | 'spaces'
    | 'sshKeys'
    | 'templates'
    | 'operations'
    | 'audit'
    | 'sessions'
    | 'history'
    | 'containers'
    | 'images'
    | 'compose'
    | 'networks'
    | 'volumes'
    | 'fileManager'
    | 'permissions'
    | 'search'
    | 'connections'
    | 'backups'
    | 'queries';
  to?: string;
  permission?: PermissionCode;
  available: boolean;
  requiresServer?: boolean;
};

export type NavGroup = {
  id: string;
  labelKey: 'servers' | 'terminal' | 'docker' | 'files' | 'databases';
  icon: Icon;
  to?: string;
  permission?: PermissionCode;
  requiresServer?: boolean;
  children: NavLeaf[];
};

export type SystemNavItem = {
  id: string;
  labelKey: 'monitoring' | 'notifications' | 'users' | 'settings';
  icon: Icon;
  to?: string;
  available: boolean;
};

export const MICROSERVICE_NAV: NavGroup[] = [
  {
    id: 'servers',
    labelKey: 'servers',
    icon: ServersIcon,
    to: '/servers',
    permission: PERMISSIONS.SERVERS_VIEW,
    children: [
      {
        id: 'all-servers',
        labelKey: 'allServers',
        to: '/servers',
        permission: PERMISSIONS.SERVERS_VIEW,
        available: true,
      },
      {
        id: 'spaces',
        labelKey: 'spaces',
        to: '/server-spaces',
        permission: PERMISSIONS.SERVERS_VIEW,
        available: true,
      },
      {
        id: 'ssh-keys',
        labelKey: 'sshKeys',
        to: '/server-ssh-keys',
        permission: PERMISSIONS.SSH_KEYS_READ,
        available: true,
      },
      { id: 'templates', labelKey: 'templates', available: false },
      {
        id: 'operations',
        labelKey: 'operations',
        to: '/server-operations',
        permission: PERMISSIONS.SERVERS_VIEW,
        available: true,
      },
      {
        id: 'audit',
        labelKey: 'audit',
        to: '/server-audit',
        permission: PERMISSIONS.AUDIT_VIEW,
        available: true,
      },
    ],
  },
  {
    id: 'terminal',
    labelKey: 'terminal',
    icon: TerminalIcon,
    permission: PERMISSIONS.TERMINAL_OPEN,
    requiresServer: true,
    children: [
      {
        id: 'sessions',
        labelKey: 'sessions',
        available: false,
        requiresServer: true,
        permission: PERMISSIONS.TERMINAL_OPEN,
      },
      {
        id: 'history',
        labelKey: 'history',
        available: false,
        requiresServer: true,
        permission: PERMISSIONS.TERMINAL_OPEN,
      },
    ],
  },
  {
    id: 'docker',
    labelKey: 'docker',
    icon: DockerIcon,
    permission: PERMISSIONS.DOCKER_VIEW,
    requiresServer: true,
    children: [
      { id: 'containers', labelKey: 'containers', available: false, requiresServer: true },
      { id: 'images', labelKey: 'images', available: false, requiresServer: true },
      { id: 'compose', labelKey: 'compose', available: false, requiresServer: true },
      { id: 'networks', labelKey: 'networks', available: false, requiresServer: true },
      { id: 'volumes', labelKey: 'volumes', available: false, requiresServer: true },
    ],
  },
  {
    id: 'files',
    labelKey: 'files',
    icon: FilesIcon,
    requiresServer: true,
    children: [
      { id: 'file-manager', labelKey: 'fileManager', available: false, requiresServer: true },
      { id: 'permissions', labelKey: 'permissions', available: false, requiresServer: true },
      { id: 'search', labelKey: 'search', available: false, requiresServer: true },
    ],
  },
  {
    id: 'databases',
    labelKey: 'databases',
    icon: DatabasesIcon,
    permission: PERMISSIONS.DATABASES_VIEW,
    requiresServer: true,
    children: [
      { id: 'connections', labelKey: 'connections', available: false, requiresServer: true },
      { id: 'backups', labelKey: 'backups', available: false, requiresServer: true },
      { id: 'queries', labelKey: 'queries', available: false, requiresServer: true },
    ],
  },
];

export const SYSTEM_NAV: SystemNavItem[] = [
  { id: 'monitoring', labelKey: 'monitoring', icon: MonitoringIcon, available: false },
  { id: 'notifications', labelKey: 'notifications', icon: BellIcon, available: false },
  { id: 'users', labelKey: 'users', icon: UsersIcon, available: false },
  { id: 'settings', labelKey: 'settings', icon: SettingsIcon, available: false },
];

export function isPathActive(pathname: string, to?: string): boolean {
  if (!to) {
    return false;
  }
  if (to === '/dashboard') {
    return pathname === '/dashboard';
  }
  if (to === '/servers') {
    return pathname === '/servers' || pathname.startsWith('/servers/');
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function isServersSection(pathname: string): boolean {
  return (
    pathname === '/servers' ||
    pathname.startsWith('/servers/') ||
    pathname.startsWith('/server-spaces') ||
    pathname.startsWith('/server-groups') ||
    pathname.startsWith('/server-operations') ||
    pathname.startsWith('/server-audit') ||
    pathname.startsWith('/server-ssh-keys')
  );
}
