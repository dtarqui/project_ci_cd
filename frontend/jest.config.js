module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  moduleFileExtensions: ["js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/index.js",
    "!src/services/api.js", // API service is mocked
    "!src/setupTests.js",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json"],
  reporters: ["default", ["jest-junit", { outputDirectory: ".", outputName: "junit.xml" }]],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 82,
      lines: 87,
      statements: 87,
    },
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg|png)$": "identity-obj-proxy",
  },
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  verbose: true,
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.(js|jsx)",
    "<rootDir>/src/**/*.(test|spec).(js|jsx)",
  ],
};
