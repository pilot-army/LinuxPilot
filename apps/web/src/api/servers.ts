import type {
  AddTagsRequest,
  AssignGroupRequest,
  BulkActionResponse,
  BulkGroupRequest,
  BulkMaintenanceRequest,
  BulkOperationsRequest,
  BulkTagsRequest,
  CreateGroupRequest,
  CreateOperationRequest,
  CreateServerRequest,
  EnrollmentTokenResponse,
  ListEventsQuery,
  MaintenanceInfo,
  MaintenanceRequest,
  ServerAuditResponse,
  ServerDetail,
  ServerEventListResponse,
  ServerGroup,
  ServerGroupListResponse,
  ServerHealth,
  ServerListResponse,
  ServerMetricsResponse,
  ServerOperation,
  ServerOperationListResponse,
  ServerUpdateStatus,
  UpdateGroupRequest,
  UpdateServerRequest,
  AgentInfo,
} from '@linuxpilot/server-contracts';
import { apiRequest } from './client';

export function listServers(params: URLSearchParams) {
  return apiRequest<ServerListResponse>(`/servers?${params.toString()}`);
}

export function getServer(id: string) {
  return apiRequest<ServerDetail>(`/servers/${id}`);
}

export function createServer(body: CreateServerRequest) {
  return apiRequest<ServerDetail>('/servers', { method: 'POST', body });
}

export function updateServer(id: string, body: UpdateServerRequest) {
  return apiRequest<ServerDetail>(`/servers/${id}`, { method: 'PATCH', body });
}

export function deleteServer(id: string) {
  return apiRequest<{ success: boolean }>(`/servers/${id}`, { method: 'DELETE' });
}

export function createEnrollmentToken(id: string) {
  return apiRequest<EnrollmentTokenResponse>(`/servers/${id}/enrollment-token`, { method: 'POST' });
}

export function revokeServer(id: string) {
  return apiRequest<{ success: boolean }>(`/servers/${id}/revoke`, { method: 'POST' });
}

export function rotateServerCredential(id: string) {
  return apiRequest<EnrollmentTokenResponse>(`/servers/${id}/rotate-credential`, {
    method: 'POST',
  });
}

export function getServerMetrics(id: string, params?: URLSearchParams) {
  const query = params?.toString();
  return apiRequest<ServerMetricsResponse>(
    query ? `/servers/${id}/metrics/history?${query}` : `/servers/${id}/metrics/history`,
  );
}

export function getServerAudit(id: string) {
  return apiRequest<ServerAuditResponse>(`/servers/${id}/audit`);
}

export function getServerEvents(id: string, params?: URLSearchParams) {
  const query = params?.toString();
  return apiRequest<ServerEventListResponse>(
    query ? `/servers/${id}/events?${query}` : `/servers/${id}/events`,
  );
}

export function getServerHealth(id: string) {
  return apiRequest<ServerHealth>(`/servers/${id}/health`);
}

export function getServerAgent(id: string) {
  return apiRequest<AgentInfo>(`/servers/${id}/agent`);
}

export function getServerUpdates(id: string) {
  return apiRequest<ServerUpdateStatus>(`/servers/${id}/updates`);
}

export function getServerMaintenance(id: string) {
  return apiRequest<MaintenanceInfo>(`/servers/${id}/maintenance`);
}

export function startServerMaintenance(id: string, body: MaintenanceRequest) {
  return apiRequest<MaintenanceInfo>(`/servers/${id}/maintenance`, { method: 'POST', body });
}

export function endServerMaintenance(id: string) {
  return apiRequest<MaintenanceInfo>(`/servers/${id}/maintenance`, { method: 'DELETE' });
}

export function listServerGroups() {
  return apiRequest<ServerGroupListResponse>('/server-spaces');
}

export function getServerGroup(id: string) {
  return apiRequest<ServerGroup>(`/server-spaces/${id}`);
}

export function createServerGroup(
  body: Partial<CreateGroupRequest> & Pick<CreateGroupRequest, 'name'>,
) {
  return apiRequest<ServerGroup>('/server-spaces', {
    method: 'POST',
    body,
  });
}

export function updateServerGroup(id: string, body: UpdateGroupRequest) {
  return apiRequest<ServerGroup>(`/server-spaces/${id}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteServerGroup(id: string, body?: { moveToSpaceId?: string | null }) {
  return apiRequest<{ success: boolean }>(`/server-spaces/${id}`, { method: 'DELETE', body });
}

export function assignServerGroup(id: string, body: AssignGroupRequest) {
  return apiRequest<ServerDetail>(`/servers/${id}/space`, { method: 'POST', body });
}

export function addServerTags(id: string, body: AddTagsRequest) {
  return apiRequest<ServerDetail>(`/servers/${id}/tags`, { method: 'POST', body });
}

export function listServerOperations(params?: URLSearchParams) {
  const query = params?.toString();
  return apiRequest<ServerOperationListResponse>(
    query ? `/server-operations?${query}` : '/server-operations',
  );
}

export function listServerOperationsFor(id: string, params?: URLSearchParams) {
  const query = params?.toString();
  return apiRequest<ServerOperationListResponse>(
    query ? `/servers/${id}/operations?${query}` : `/servers/${id}/operations`,
  );
}

export function createServerOperation(id: string, body: CreateOperationRequest) {
  return apiRequest<ServerOperation>(`/servers/${id}/operations`, { method: 'POST', body });
}

export function listServerAudit(params?: URLSearchParams) {
  const query = params?.toString();
  return apiRequest<ServerAuditResponse>(query ? `/server-audit?${query}` : '/server-audit');
}

export function listGlobalEvents(params?: URLSearchParams) {
  const query = params?.toString();
  return apiRequest<ServerEventListResponse>(query ? `/server-events?${query}` : '/server-events');
}

export function bulkAssignGroup(body: BulkGroupRequest) {
  return apiRequest<BulkActionResponse>('/servers/bulk/space', { method: 'POST', body });
}

export function bulkUpdateTags(body: BulkTagsRequest) {
  return apiRequest<BulkActionResponse>('/servers/bulk/tags', { method: 'POST', body });
}

export function bulkStartMaintenance(body: BulkMaintenanceRequest) {
  return apiRequest<BulkActionResponse>('/servers/bulk/maintenance', { method: 'POST', body });
}

export function bulkCreateOperations(body: BulkOperationsRequest) {
  return apiRequest<BulkActionResponse>('/servers/bulk/operations', { method: 'POST', body });
}

export type { ListEventsQuery };
