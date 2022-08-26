module.exports = {
  "modulePaths": [
    "<rootDir>/resources/sdk/node/v1/"
  ],
    "roots": [
      "<rootDir>/test"
    ],
    testMatch: [ '**/*.test.ts'],
    "transform": {
      "^.+\\.tsx?$": "ts-jest"
    },
    coverageReporters: [
      "text",
      ["lcov", {"projectRoot": "../"}]
    ]
  }
