export const WIZARD_STEPS = [1, 2, 3, 4] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const STEP_STATES = ['pending', 'active', 'completed', 'error'] as const;
export type StepState = (typeof STEP_STATES)[number];

export const DISTRIBUTIONS = ['ubuntu', 'debian', 'other'] as const;
export type Distribution = (typeof DISTRIBUTIONS)[number];

export const ARCHITECTURES = ['amd64', 'arm64'] as const;
export type Architecture = (typeof ARCHITECTURES)[number];

export const INSTALL_MODES = ['auto', 'manual', 'none'] as const;
export type InstallMode = (typeof INSTALL_MODES)[number];

export const METRIC_INTERVALS = ['30', '60', '300'] as const;
export type MetricInterval = (typeof METRIC_INTERVALS)[number];

export const CHECK_STATES = ['idle', 'testing', 'success', 'warning', 'error'] as const;
export type CheckState = (typeof CHECK_STATES)[number];

export const WIZARD_PHASES = [
  'form',
  'creating_server',
  'installing_agent',
  'waiting_heartbeat',
  'success',
  'partial_success',
  'error',
] as const;
export type WizardPhase = (typeof WIZARD_PHASES)[number];

export const TIMELINE_IDS = [
  'created',
  'token',
  'waiting',
  'connected',
  'heartbeat',
  'metrics',
] as const;
export type TimelineId = (typeof TIMELINE_IDS)[number];

export const TIMELINE_STATES = [
  'waiting',
  'done',
  'timeout',
  'revoked',
  'expired',
  'error',
] as const;
export type TimelineState = (typeof TIMELINE_STATES)[number];

export const CONNECTION_OUTCOMES = [
  'waiting',
  'connected',
  'metrics',
  'timeout',
  'revoked',
  'expired',
  'error',
] as const;
export type ConnectionOutcome = (typeof CONNECTION_OUTCOMES)[number];

export type WizardForm = {
  name: string;
  address: string;
  hostname: string;
  primaryIp: string;
  description: string;
  spaceId: string;
  tags: string[];
  distribution: Distribution | '';
  osVersion: string;
  architecture: Architecture | '';
  detectAutomatically: boolean;
  sshPort: string;
  sshUser: string;
  sshKeyId: string;
  useSudo: boolean;
  fingerprintCheck: boolean;
  installMode: InstallMode;
  updateChannel: 'stable';
  autoUpdate: boolean;
  metricsEnabled: boolean;
  metricCpu: boolean;
  metricRam: boolean;
  metricDisk: boolean;
  metricNetwork: boolean;
  metricsInterval: MetricInterval;
  remoteControl: boolean;
  confirmNoAgent: boolean;
  confirmAdd: boolean;
};

export type EnrollmentSecret = {
  token: string;
  enrollCommand: string;
  installCommand: string;
  expiresAt: string;
};

export type FieldKey =
  | 'name'
  | 'address'
  | 'hostname'
  | 'primaryIp'
  | 'description'
  | 'osVersion'
  | 'tags'
  | 'distribution'
  | 'architecture'
  | 'sshPort'
  | 'sshUser';

export type FieldErrors = Partial<Record<FieldKey, string>>;

export type TimelineItem = {
  id: TimelineId;
  state: TimelineState;
};

export const emptyForm = (): WizardForm => ({
  name: '',
  address: '',
  hostname: '',
  primaryIp: '',
  description: '',
  spaceId: '',
  tags: [],
  distribution: '',
  osVersion: '',
  architecture: '',
  detectAutomatically: true,
  sshPort: '22',
  sshUser: 'linuxpilot',
  sshKeyId: '',
  useSudo: true,
  fingerprintCheck: true,
  installMode: 'auto',
  updateChannel: 'stable',
  autoUpdate: true,
  metricsEnabled: true,
  metricCpu: true,
  metricRam: true,
  metricDisk: true,
  metricNetwork: true,
  metricsInterval: '60',
  remoteControl: true,
  confirmNoAgent: false,
  confirmAdd: false,
});
