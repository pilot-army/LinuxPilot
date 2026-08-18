import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!**/*.spec.ts', '!src/main.ts', '!src/generated/**'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/dist'],
};

export default config;
