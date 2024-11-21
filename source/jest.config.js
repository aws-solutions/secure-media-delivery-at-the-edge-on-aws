// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
