import type { Locale, Namespace } from './config';
import type { Assert, ExactEqual, MessageKeyTree } from './types';
import enAuth from './en/auth.json';
import enCommon from './en/common.json';
import enDashboard from './en/dashboard.json';
import enErrors from './en/errors.json';
import enNavigation from './en/navigation.json';
import enServers from './en/servers.json';
import enValidation from './en/validation.json';
import ukAuth from './uk/auth.json';
import ukCommon from './uk/common.json';
import ukDashboard from './uk/dashboard.json';
import ukErrors from './uk/errors.json';
import ukNavigation from './uk/navigation.json';
import ukServers from './uk/servers.json';
import ukValidation from './uk/validation.json';

const en = {
  common: enCommon,
  auth: enAuth,
  navigation: enNavigation,
  validation: enValidation,
  errors: enErrors,
  servers: enServers,
  dashboard: enDashboard,
} as const;

const uk = {
  common: ukCommon,
  auth: ukAuth,
  navigation: ukNavigation,
  validation: ukValidation,
  errors: ukErrors,
  servers: ukServers,
  dashboard: ukDashboard,
} as const;

type _CommonKeysMatch = Assert<
  ExactEqual<MessageKeyTree<typeof ukCommon>, MessageKeyTree<typeof enCommon>>
>;
type _AuthKeysMatch = Assert<
  ExactEqual<MessageKeyTree<typeof ukAuth>, MessageKeyTree<typeof enAuth>>
>;
type _NavigationKeysMatch = Assert<
  ExactEqual<MessageKeyTree<typeof ukNavigation>, MessageKeyTree<typeof enNavigation>>
>;
type _ValidationKeysMatch = Assert<
  ExactEqual<MessageKeyTree<typeof ukValidation>, MessageKeyTree<typeof enValidation>>
>;
type _ErrorsKeysMatch = Assert<
  ExactEqual<MessageKeyTree<typeof ukErrors>, MessageKeyTree<typeof enErrors>>
>;
type _ServersKeysMatch = Assert<
  ExactEqual<MessageKeyTree<typeof ukServers>, MessageKeyTree<typeof enServers>>
>;
type _DashboardKeysMatch = Assert<
  ExactEqual<MessageKeyTree<typeof ukDashboard>, MessageKeyTree<typeof enDashboard>>
>;
type _ResourceKeysMatch = Assert<ExactEqual<MessageKeyTree<typeof uk>, MessageKeyTree<typeof en>>>;

export const resources = {
  uk,
  en,
} as const satisfies Record<Locale, Record<Namespace, object>>;

export type TranslationResources = typeof resources;
export type Messages = TranslationResources[Locale];
