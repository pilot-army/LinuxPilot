import { EnrollmentWizard } from '../dashboard/components/enrollment-wizard';
import { DashboardShell } from '../dashboard/components/dashboard-shell';

export function AddServerPage() {
  return (
    <DashboardShell>
      <EnrollmentWizard variant="page" />
    </DashboardShell>
  );
}
