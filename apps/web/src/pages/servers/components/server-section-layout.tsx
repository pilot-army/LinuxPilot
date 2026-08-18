import type { ReactNode } from 'react';
import { DashboardShell } from '../../dashboard/components/dashboard-shell';

type ServerSectionLayoutProps = {
  children: ReactNode;
  liveMessage?: string;
  testId?: string;
  busy?: boolean;
};

export function ServerSectionLayout({
  children,
  liveMessage,
  testId,
  busy,
}: ServerSectionLayoutProps) {
  return (
    <DashboardShell>
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
      <div aria-busy={busy || undefined} data-testid={testId}>
        {children}
      </div>
    </DashboardShell>
  );
}
