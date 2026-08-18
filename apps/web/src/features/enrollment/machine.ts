import type { StepState, WizardStep } from './types';

export function clampStep(step: number): WizardStep {
  if (step <= 1) {
    return 1;
  }
  if (step >= 4) {
    return 4;
  }
  return step as WizardStep;
}

export function canVisitStep(target: WizardStep, maxReached: WizardStep): boolean {
  return target <= maxReached;
}

export function stepStateFor(
  id: WizardStep,
  current: WizardStep,
  maxReached: WizardStep,
  errorStep: WizardStep | null,
): StepState {
  if (id === current) {
    return 'active';
  }
  if (errorStep === id) {
    return 'error';
  }
  if (id <= maxReached) {
    return 'completed';
  }
  return 'pending';
}

export function progressPercent(step: WizardStep, connected: boolean, hasMetrics: boolean): number {
  if (hasMetrics) {
    return 100;
  }
  if (connected) {
    return 92;
  }
  return Math.round(((step - 1) / 4) * 100);
}

export function nextStep(step: WizardStep): WizardStep {
  return clampStep(step + 1);
}

export function previousStep(step: WizardStep): WizardStep {
  return clampStep(step - 1);
}
