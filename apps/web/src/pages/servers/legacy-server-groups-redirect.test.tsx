import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LegacyServerGroupsRedirect } from './legacy-server-groups-redirect';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

describe('LegacyServerGroupsRedirect', () => {
  it('redirects list filters to /server-spaces', () => {
    render(
      <MemoryRouter initialEntries={['/server-groups?q=prod']}>
        <Routes>
          <Route path="/server-groups" element={<LegacyServerGroupsRedirect />} />
          <Route path="/server-spaces" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    const location = screen.getByTestId('location').textContent ?? '';
    const url = new URL(location, 'http://linuxpilot.local');
    expect(url.pathname).toBe('/server-spaces');
    expect(url.searchParams.get('q')).toBe('prod');
  });

  it('redirects a legacy space query to the space page', () => {
    render(
      <MemoryRouter initialEntries={['/server-groups?groupId=g1&q=prod']}>
        <Routes>
          <Route path="/server-groups" element={<LegacyServerGroupsRedirect />} />
          <Route path="/server-spaces/:spaceSlug" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('location').textContent).toBe('/server-spaces/g1');
  });
});
