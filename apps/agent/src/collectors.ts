import { readFileSync, statfsSync } from 'node:fs';
import { arch, hostname, networkInterfaces, release, type NetworkInterfaceInfo } from 'node:os';
import { type AgentHeartbeatRequest, type DiskMetric } from '@linuxpilot/server-contracts';

const EXCLUDED_FS = new Set([
  'proc',
  'sysfs',
  'tmpfs',
  'devtmpfs',
  'overlay',
  'cgroup',
  'cgroup2',
  'securityfs',
  'debugfs',
  'tracefs',
  'fusectl',
  'configfs',
  'pstore',
  'bpf',
  'nsfs',
  'ramfs',
  'hugetlbfs',
  'mqueue',
  'devpts',
  'autofs',
  'rpc_pipefs',
  'squashfs',
]);

export type ProcSnapshot = {
  cpu: { idle: number; total: number };
};

export function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

export function parseCpuStat(stat: string): ProcSnapshot['cpu'] | null {
  const line = stat.split('\n').find((row) => row.startsWith('cpu '));
  if (!line) {
    return null;
  }
  const parts = line.trim().split(/\s+/).slice(1).map(Number);
  if (parts.length < 4 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }
  const idle = (parts[3] ?? 0) + (parts[4] ?? 0);
  const total = parts.reduce((sum, value) => sum + value, 0);
  return { idle, total };
}

export function cpuUsageFromDelta(
  first: ProcSnapshot['cpu'],
  second: ProcSnapshot['cpu'],
): number | null {
  const idle = second.idle - first.idle;
  const total = second.total - first.total;
  if (total <= 0) {
    return null;
  }
  const used = 1 - idle / total;
  return Math.max(0, Math.min(100, Math.round(used * 1000) / 10));
}

export function parseLoadavg(
  content: string,
): { load1: number; load5: number; load15: number } | null {
  const [one, five, fifteen] = content.trim().split(/\s+/).map(Number);
  if ([one, five, fifteen].some((value) => Number.isNaN(value))) {
    return null;
  }
  return { load1: one ?? 0, load5: five ?? 0, load15: fifteen ?? 0 };
}

export function parseMeminfo(content: string): {
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  swapUsedBytes: number;
  swapTotalBytes: number;
} | null {
  const map = new Map<string, number>();
  for (const line of content.split('\n')) {
    const match = /^(\w+):\s+(\d+) kB/.exec(line);
    if (match?.[1] && match[2]) {
      map.set(match[1], Number(match[2]) * 1024);
    }
  }
  const total = map.get('MemTotal');
  const available = map.get('MemAvailable');
  const swapTotal = map.get('SwapTotal') ?? 0;
  const swapFree = map.get('SwapFree') ?? 0;
  if (!total || available === undefined) {
    return null;
  }
  return {
    memoryTotalBytes: total,
    memoryUsedBytes: Math.max(0, total - available),
    swapTotalBytes: swapTotal,
    swapUsedBytes: Math.max(0, swapTotal - swapFree),
  };
}

export function parseUptime(content: string): number | null {
  const value = Number(content.trim().split(/\s+/)[0]);
  return Number.isFinite(value) ? Math.floor(value) : null;
}

export function parseOsRelease(content: string): { osName: string; osVersion: string } {
  const map = new Map<string, string>();
  for (const line of content.split('\n')) {
    const index = line.indexOf('=');
    if (index === -1) continue;
    map.set(line.slice(0, index), line.slice(index + 1).replaceAll('"', ''));
  }
  return {
    osName: map.get('NAME') ?? 'Linux',
    osVersion: map.get('VERSION_ID') ?? map.get('VERSION') ?? 'unknown',
  };
}

export function parseMounts(content: string): DiskMetric[] {
  const disks: DiskMetric[] = [];
  for (const line of content.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue;
    const mountPoint = parts[1] ?? '';
    const filesystem = parts[2] ?? '';
    if (!mountPoint.startsWith('/')) continue;
    const excluded = EXCLUDED_FS.has(filesystem);
    disks.push({
      mountPoint,
      filesystem,
      usedBytes: 0,
      totalBytes: 1,
      usedPercent: 0,
      ...(excluded ? { excluded: true } : {}),
    });
  }
  return disks;
}

export function pickPrimaryIp(
  nets: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces(),
): string | undefined {
  const candidates: string[] = [];
  for (const addrs of Object.values(nets)) {
    for (const addr of addrs ?? []) {
      const family = String(addr.family);
      if ((family !== 'IPv4' && family !== '4') || addr.internal) {
        continue;
      }
      if (addr.address.startsWith('169.254.')) {
        continue;
      }
      candidates.push(addr.address);
    }
  }
  return candidates.find((ip) => !isContainerBridge(ip)) ?? candidates[0];
}

function isContainerBridge(ip: string): boolean {
  return ip.startsWith('172.17.') || ip.startsWith('172.18.');
}

export async function collectHeartbeat(
  root = '',
  cpuSampleMs = 250,
  version = '0.1.0',
): Promise<AgentHeartbeatRequest> {
  const first = parseCpuStat(readFileSafe(`${root}/proc/stat`) ?? '');
  await sleep(cpuSampleMs);
  const second = parseCpuStat(readFileSafe(`${root}/proc/stat`) ?? '');
  const load = parseLoadavg(readFileSafe(`${root}/proc/loadavg`) ?? '');
  const memory = parseMeminfo(readFileSafe(`${root}/proc/meminfo`) ?? '');
  const uptime = parseUptime(readFileSafe(`${root}/proc/uptime`) ?? '');
  const os = parseOsRelease(readFileSafe(`${root}/etc/os-release`) ?? '');
  const mounts = parseMounts(readFileSafe(`${root}/proc/mounts`) ?? '');
  const disks = mounts.map((disk) => (disk.excluded ? disk : withUsage(root, disk)));
  const primaryIp = pickPrimaryIp();

  return {
    hostname: hostname(),
    ...(primaryIp ? { primaryIp } : {}),
    osName: os.osName,
    osVersion: os.osVersion,
    kernelVersion: release(),
    architecture: arch(),
    agentVersion: version,
    cpuUsagePercent: first && second ? cpuUsageFromDelta(first, second) : null,
    load1: load?.load1 ?? null,
    load5: load?.load5 ?? null,
    load15: load?.load15 ?? null,
    memoryUsedBytes: memory?.memoryUsedBytes ?? null,
    memoryTotalBytes: memory?.memoryTotalBytes ?? null,
    swapUsedBytes: memory?.swapUsedBytes ?? null,
    swapTotalBytes: memory?.swapTotalBytes ?? null,
    uptimeSeconds: uptime,
    disks,
  };
}

function withUsage(root: string, disk: DiskMetric): DiskMetric {
  try {
    const info = statfsSync(`${root}${disk.mountPoint}`);
    const totalBytes = info.bsize * info.blocks;
    const available = info.bsize * info.bavail;
    const usedBytes = Math.max(0, totalBytes - available);
    return {
      ...disk,
      usedBytes,
      totalBytes: Math.max(totalBytes, 1),
      usedPercent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0,
    };
  } catch {
    return { ...disk, excluded: true };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
