import { Navigate, useLocation } from 'react-router-dom';

export function LegacyServerGroupsRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const legacySpaceId =
    params.get('spaceId') ?? params.get('groupId') ?? params.get('environmentId');
  params.delete('groupId');
  params.delete('environmentId');
  params.delete('environment');
  params.delete('env');
  params.delete('spaceId');
  if (legacySpaceId) {
    return <Navigate to={`/server-spaces/${legacySpaceId}${location.hash}`} replace />;
  }
  const search = params.toString();
  return <Navigate to={`/server-spaces${search ? `?${search}` : ''}${location.hash}`} replace />;
}
