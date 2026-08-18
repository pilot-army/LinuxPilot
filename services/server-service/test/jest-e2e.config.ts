import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 30000,
};

export default config;
