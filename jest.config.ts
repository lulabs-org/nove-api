import type { Config } from 'jest';

const common: Partial<Config> = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts', 'json'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          isolatedModules: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.types.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.exception.ts',
    '!src/**/*.decorator.ts',
  ],
};

const config: Config = {
  maxWorkers: '50%',
  projects: [
    {
      displayName: 'unit',
      ...common,
      testMatch: [
        '<rootDir>/src/**/*.spec.ts',
        '<rootDir>/test/unit/**/*.spec.ts',
      ],
      coverageDirectory: 'coverage/unit',
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    {
      displayName: 'integration',
      ...common,
      testMatch: ['<rootDir>/test/integration/**/*.int-spec.ts'],
      coverageDirectory: 'coverage/integration',
      setupFilesAfterEnv: ['<rootDir>/test/setup-integration.ts'],
    },
    {
      displayName: 'system',
      ...common,
      testMatch: ['<rootDir>/test/system/**/*.spec.ts'],
      coverageDirectory: 'coverage/system',
      setupFilesAfterEnv: ['<rootDir>/test/setup-system.ts'],
    },
    {
      displayName: 'e2e',
      ...common,
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
      coverageDirectory: 'coverage/e2e',
    },
  ],
};

export default config;
