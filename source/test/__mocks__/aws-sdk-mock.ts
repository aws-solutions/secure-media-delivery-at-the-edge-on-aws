import { mockClient } from 'aws-sdk-client-mock';
const {
    Lambda,
    UpdateFunctionConfigurationCommand,
    CreateFunctionCommand,
    GetFunctionConfigurationCommand,
    PublishVersionCommand,
} = require("@aws-sdk/client-lambda");
const { SSM, PutParameterCommand } = require("@aws-sdk/client-ssm");
const {
    WAFV2,
    GetRuleGroupCommand,
    UpdateRuleGroupCommand,
    CreateRuleGroupCommand,
} = require("@aws-sdk/client-wafv2");
const {
    CloudFront,
    DescribeFunctionCommand,
    UpdateFunctionCommand,
    PublishFunctionCommand,
} = require("@aws-sdk/client-cloudfront");
const {
    SecretsManager,
    GetSecretValueCommand,
    PutSecretValueCommand
} = require("@aws-sdk/client-secrets-manager");
const { DynamoDBDocument, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { DynamoDB, PutItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
import mockResponse from './mock-responses';

const mockAwsClient = (awsClient: any, clientMethod: any, mockResponse: any, mockObject: any = null) => {
    const mock = mockObject || mockClient(awsClient);
    mock
        .on(clientMethod)
        .resolves(mockResponse);
    return mock;
}

const mockSecretsManager = () => {
    const mock = mockAwsClient(SecretsManager, GetSecretValueCommand, mockResponse.SecretsManager.GetSecretValue);
    mockAwsClient(SecretsManager, PutSecretValueCommand, '', mock);
    return mock;
}

const mockLambda = () => {
    const mock = mockAwsClient(Lambda, UpdateFunctionConfigurationCommand, undefined);
    mockAwsClient(Lambda, CreateFunctionCommand, { FunctionArn: 'MyFunctionArn' }, mock);
    mockAwsClient(Lambda, GetFunctionConfigurationCommand, { FunctionArn: 'MyFunctionArn', State: 'Active' }, mock);
    mockAwsClient(Lambda, PublishVersionCommand, { Version: '1' }, mock);
    return mock;
}

const mockSSM = () => {
    return mockAwsClient(SSM, PutParameterCommand, mockResponse.SSM.PutParameter);
};

const mockWAFV2 = () => {
    const mock = mockAwsClient(WAFV2, GetRuleGroupCommand, mockResponse.WAFV2.GetRuleGroup);
    mockAwsClient(WAFV2, UpdateRuleGroupCommand, undefined, mock);
    mockAwsClient(WAFV2, CreateRuleGroupCommand, mockResponse.WAFV2.CreateRuleGroup, mock);
    return mock;
};

const mockDynamoDB = () => {
    const mock = mockAwsClient(DynamoDB, PutItemCommand, '');
    mockAwsClient(DynamoDB, QueryCommand, mockResponse.DynamoDB.Query, mock);
    return mock;
};

const mockDynamoDBDocument = () => {
    const mock = mockAwsClient(DynamoDBDocument, GetCommand, mockResponse.DynamoDBDocument.Get);
    mockAwsClient(DynamoDBDocument, UpdateCommand, '', mock);
    return mock;
};

const mockCloudfront = () => {
    const mock = mockAwsClient(CloudFront, DescribeFunctionCommand, mockResponse.CloudFront.DescribeFunction);
    mockAwsClient(CloudFront, UpdateFunctionCommand, '', mock);
    mockAwsClient(CloudFront, PublishFunctionCommand, '', mock);
    return mock;
};

export default {
    mockAllAWSClients: () => {
        const mocks = [];
        mocks.push(mockSecretsManager());
        mocks.push(mockLambda());
        mocks.push(mockSSM());
        mocks.push(mockWAFV2());
        mocks.push(mockDynamoDB());
        mocks.push(mockDynamoDBDocument());
        mocks.push(mockCloudfront());
        return mocks;
    },
    reseMocks: (mocks: any[]) => {
        for (const mock of mocks) {
            mock.reset();
        }
    },
};
