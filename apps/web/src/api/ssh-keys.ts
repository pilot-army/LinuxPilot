import type {
  AddPublicSshKeyRequest,
  GenerateSshKeyRequest,
  ImportPrivateSshKeyRequest,
  InspectSshKeyRequest,
  InstallSshKeyRequest,
  RotateSshKeyRequest,
  SshKey,
  SshKeyDetail,
  SshKeyListResponse,
  SshKeyMutationResponse,
  SshKeyPreview,
  SshKeyUsagesResponse,
  UpdateSshKeyRequest,
} from '@linuxpilot/server-contracts';
import { apiRequest } from './client';

export function listSshKeys(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<SshKeyListResponse>(query ? `/ssh-keys?${query}` : '/ssh-keys');
}

export function inspectSshKey(body: InspectSshKeyRequest) {
  return apiRequest<SshKeyPreview>('/ssh-keys/inspect', { method: 'POST', body });
}

export function importPrivateSshKey(body: ImportPrivateSshKeyRequest) {
  return apiRequest<SshKey>('/ssh-keys/import', { method: 'POST', body });
}

export function addPublicSshKey(body: AddPublicSshKeyRequest) {
  return apiRequest<SshKey>('/ssh-keys/public', { method: 'POST', body });
}

export function generateSshKey(body: GenerateSshKeyRequest) {
  return apiRequest<SshKey>('/ssh-keys/generate', { method: 'POST', body });
}

export function getSshKey(id: string) {
  return apiRequest<SshKeyDetail>(`/ssh-keys/${id}`);
}

export function getSshKeyUsages(id: string) {
  return apiRequest<SshKeyUsagesResponse>(`/ssh-keys/${id}/usages`);
}

export function updateSshKey(id: string, body: UpdateSshKeyRequest) {
  return apiRequest<SshKey>(`/ssh-keys/${id}`, { method: 'PATCH', body });
}

export function disableSshKey(id: string) {
  return apiRequest<SshKey>(`/ssh-keys/${id}/disable`, { method: 'POST' });
}

export function deleteSshKey(id: string) {
  return apiRequest<{ success: boolean }>(`/ssh-keys/${id}`, { method: 'DELETE' });
}

export function installSshKey(id: string, body: InstallSshKeyRequest) {
  return apiRequest<SshKeyMutationResponse>(`/ssh-keys/${id}/install`, { method: 'POST', body });
}

export function rotateSshKey(id: string, body: RotateSshKeyRequest) {
  return apiRequest<SshKeyMutationResponse>(`/ssh-keys/${id}/rotate`, { method: 'POST', body });
}
