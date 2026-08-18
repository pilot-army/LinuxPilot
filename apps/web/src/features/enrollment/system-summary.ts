import type { WizardForm } from './types';

type SystemCopy = {
  osWillDetect: string;
  ubuntu: string;
  debian: string;
  otherLinux: string;
};

export function formatSystemSummary(form: WizardForm, copy: SystemCopy): string {
  if (form.detectAutomatically || !form.distribution || !form.architecture) {
    return copy.osWillDetect;
  }
  const distro =
    form.distribution === 'debian'
      ? copy.debian
      : form.distribution === 'other'
        ? copy.otherLinux
        : copy.ubuntu;
  const version = form.osVersion.trim();
  return version
    ? `${distro} ${version} · ${form.architecture}`
    : `${distro} · ${form.architecture}`;
}
