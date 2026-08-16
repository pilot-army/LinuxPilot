import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': require.resolve('ts-jest'),
  },
  collectCoverageFrom: ['src/**/*.ts', '!**/*.spec.ts', '!src/main.ts', '!src/cli/**'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@linuxpilot/auth-contracts$': '<rootDir>/../../packages/auth-contracts/src/index.ts',
    '^@linuxpilot/common$': '<rootDir>/../../packages/common/src/index.ts',
    '^@linuxpilot/config$': '<rootDir>/../../packages/config/src/index.ts',
    '^@linuxpilot/logger$': '<rootDir>/../../packages/logger/src/index.ts',
  },
};

export default config;
