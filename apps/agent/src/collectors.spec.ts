import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NetworkInterfaceInfo } from 'node:os';
import {
  cpuUsageFromDelta,
  parseCpuStat,
  parseLoadavg,
  parseMeminfo,
  parseMounts,
  parseOsRelease,
  pickPrimaryIp,
} from './collectors';

function ipv4(address: string, internal = false): NetworkInterfaceInfo {
  return {
    address,
    netmask: '255.255.255.0',
    family: 'IPv4',
    mac: '00:00:00:00:00:00',
    internal,
    cidr: `${address}/24`,
  };
}

describe('collectors', () => {
  it('computes CPU usage from two /proc/stat samples', () => {
    const first = parseCpuStat('cpu  100 0 100 800 0 0 0 0');
    const second = parseCpuStat('cpu  150 0 150 850 0 0 0 0');
    assert.ok(first && second);
    const usage = cpuUsageFromDelta(first, second);
    assert.equal(usage, 66.7);
  });

  it('parses load, memory, and os-release without host identifiers', () => {
    const load = parseLoadavg('0.10 0.20 0.30 1/123 99');
    assert.deepEqual(load, { load1: 0.1, load5: 0.2, load15: 0.3 });
    const memory = parseMeminfo(
      'MemTotal: 8000 kB\nMemAvailable: 2000 kB\nSwapTotal: 1000 kB\nSwapFree: 400 kB\n',
    );
    assert.equal(memory?.memoryTotalBytes, 8000 * 1024);
    assert.equal(memory?.memoryUsedBytes, 6000 * 1024);
    const os = parseOsRelease('NAME="Debian GNU/Linux"\nVERSION_ID="12"\n');
    assert.equal(os.osName, 'Debian GNU/Linux');
  });

  it('marks pseudo filesystems as excluded', () => {
    const disks = parseMounts(
      [
        '/dev/sda1 / ext4 rw 0 0',
        'proc /proc proc rw 0 0',
        'tmpfs /run tmpfs rw 0 0',
        'overlay /var/lib/docker overlay rw 0 0',
      ].join('\n'),
    );
    assert.equal(disks.find((disk) => disk.mountPoint === '/')?.excluded, undefined);
    assert.equal(disks.find((disk) => disk.mountPoint === '/proc')?.excluded, true);
    assert.equal(disks.find((disk) => disk.filesystem === 'tmpfs')?.excluded, true);
    assert.equal(disks.find((disk) => disk.filesystem === 'overlay')?.excluded, true);
  });

  it('picks a public IPv4 and skips loopback, link-local, and docker bridges', () => {
    const ip = pickPrimaryIp({
      lo: [ipv4('127.0.0.1', true)],
      docker0: [ipv4('172.17.0.1')],
      eth0: [ipv4('169.254.1.2'), ipv4('10.0.1.24')],
    });
    assert.equal(ip, '10.0.1.24');
  });
});
