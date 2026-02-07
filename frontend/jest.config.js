module.exports = {
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/?(*.)+(spec|test).(ts|tsx|js)'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid)/)',
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      diagnostics: {
        ignoreDiagnostics: [1343],
      },
      astTransformers: {
        before: [
          {
            path: 'ts-jest-mock-import-meta',
            options: {
              metaObjectReplacement: {
                env: {
                  VITE_API_BASE_URL: 'http://localhost:3000',
                  VITE_VAPID_PUBLIC_KEY: 'test-vapid-key',
                },
              },
            },
          },
        ],
      },
    },
  },
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/api$': '<rootDir>/src/__mocks__/infrastructure/api/index.ts',
    '^@infrastructure/api/(.*)$': '<rootDir>/src/__mocks__/infrastructure/api/index.ts',
    '^@infrastructure/analytics/(.*)$': '<rootDir>/src/__mocks__/infrastructure/analytics/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^uuid$': '<rootDir>/src/__mocks__/uuid.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
};
