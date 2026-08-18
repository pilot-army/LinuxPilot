import type { CreateServerRequest, UpdateServerRequest } from '@linuxpilot/server-contracts';
import { ApiRequestError } from '../../api/client';
import { createServer, updateServer } from '../../api/servers';
import type { ImportOutcome, PreviewRow } from './types';

export function toCreatePayload(row: PreviewRow): CreateServerRequest {
  return {
    name: row.name.trim(),
    description: row.description,
    hostname: row.hostname || undefined,
    primaryIp: row.primaryIp || undefined,
    spaceId: row.groupId ?? undefined,
    tags: row.tags,
    autoDetectSystem: true,
  };
}

export function importReportCsv(outcomes: ImportOutcome[]): string {
  const lines = ['name,result,error'];
  for (const item of outcomes) {
    const error = item.error ? item.error.replaceAll('"', '""') : '';
    lines.push(`"${item.name.replaceAll('"', '""')}",${item.result},${error}`);
  }
  return `${lines.join('\n')}\n`;
}

export async function importSelectedServers(rows: PreviewRow[]): Promise<ImportOutcome[]> {
  const outcomes: ImportOutcome[] = [];
  for (const row of rows) {
    if (!row.selected || row.status === 'error') {
      continue;
    }
    if (row.status === 'duplicate' && row.duplicateAction === 'skip') {
      outcomes.push({ key: row.key, name: row.name, result: 'skipped' });
      continue;
    }
    try {
      if (row.status === 'duplicate' && row.duplicateAction === 'update' && row.duplicateId) {
        const body: UpdateServerRequest = {
          name: row.name,
          hostname: row.hostname || null,
          primaryIp: row.primaryIp || null,
          spaceId: row.groupId,
          tags: row.tags,
          description: row.description,
        };
        await updateServer(row.duplicateId, body);
        outcomes.push({ key: row.key, name: row.name, result: 'updated' });
        continue;
      }
      await createServer(toCreatePayload(row));
      outcomes.push({ key: row.key, name: row.name, result: 'created' });
    } catch (error) {
      const message =
        error instanceof ApiRequestError && error.status === 403
          ? 'forbidden'
          : error instanceof ApiRequestError
            ? error.code
            : 'failed';
      outcomes.push({ key: row.key, name: row.name, result: 'failed', error: message });
    }
  }
  return outcomes;
}
