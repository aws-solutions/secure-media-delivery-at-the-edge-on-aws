
# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.6] - 2024-11-21

### Security

- Security updates for npm packages

## [1.2.5] - 2024-09-17

### Security

- Security updates for npm packages

## [1.2.4] - 2024-08-09

### Security

- Upgraded vulnerable packages

## [1.2.3] - 2024-06-11

### Security

- CDK updates to 2.143.0 which removed alpha code and fixed deployment issues

### Changed

- Added solution manifest
- Updated nested dependencies for Security Updates

## [1.2.2] - 2023-11-02

### Changed

- Security updates
- Added solution manifest

## [1.2.1] - 2023-09-28

### Fixed

- Fixed an issue where the solution was not deployed properly with `cdk deploy` command

## [1.2.0] - 2023-06-29

### Changed

- Integrated Service Catalog App Registry into the solution.
- All AWS Lambda functions have been updated to the NodeJS 18 runtime.
- Along with NodeJS 18 runtime upgrade, [aws-sdk v2](https://github.com/aws/aws-sdk-js) has been updated to [aws-sdk v3](https://github.com/aws/aws-sdk-js-v3)

### Removed

- [aws-sdk v2](https://github.com/aws/aws-sdk-js) has been removed from Lambda Layers

## [1.1.4] - 2023-06-01

### Changed

- Updated aws-cdk and aws-cdk-lib to newest version 2.81.0.

### Fixed

- Custom resource created with aws-cdk-lib now on NodeJS 16.

## [1.1.3] - 2023-05-18

### Changed

- Updated video player on the demo website to a stable version.
- Updated WAF RuleGroup Name Arn to have the correct value.
- All AWS Lambda functions have been updated to the NodeJS 16 runtime.

## [1.1.2] - 2023-04-14

### Changed

- Updated object ownership configuration on on the ApiEndpointsLogsBucket bucket

## [1.1.1] - 2023-02-02

### Added

- Added architecture diagram.
- Added the package babel/traverse

## [1.1.0] - 2022-10-15

### Added

- Upgrade wizard enforce http or https protocol
- Upgrade demo website with QRcode, token parameters selector and links to solutions page
- Add constraints in the wizard for stack name and video asset url format
- Add suffix on solution name

## [1.0.1] - 2022-09-05

### Added

- Add metrics for Lambda Custom Resource

## [1.0.0] - 2022-08-25

### Added

- All files, initial version
