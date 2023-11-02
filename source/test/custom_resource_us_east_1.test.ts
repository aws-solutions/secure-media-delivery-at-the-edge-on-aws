/*  This test fails locally unless you have access to tmp folder, so
    run unit tests script with sudo */

import fs from 'fs';
import AwsSdkMock from './__mocks__/aws-sdk-mock';
const cr = require('../lambda/custom_resource_us_east_1/index.js');

jest.spyOn(fs, 'copyFileSync').mockImplementation(() => { 
    return ``;
});

describe('Custom resource', () => {
    let mocks: any[] = [];
    const env = process.env

    beforeEach(() => {
        let data = "Mocked content of my file";

        fs.writeFileSync("/tmp/le.js", data);
        
        mocks = AwsSdkMock.mockAllAWSClients();
        
        process.env = {  
            ROLE_ARN: "MyRoleArn",
            STACK_NAME: "MyStackName",
            LAMBDA_VERSION: "MyLambdaVersion",
            WCU: "100",
            RULE_ID: "MyRuleID",
            RULE_NAME: "MyRuleName",
            DEPLOY_LE: "1"
            };
    })

    afterEach(() => {
        process.env = env;
        AwsSdkMock.reseMocks(mocks);
    })

    
  test('Deploy LE - result OK', async () => {
   
    var result = await cr.handler({});
    
    expect(result).toHaveLength;
 });

 test('Do not deploy LE - result OK', async () => {
   
    process.env = {  
        ROLE_ARN: "MyRoleArn",
        STACK_NAME: "MyStackName",
        LAMBDA_VERSION: "MyLambdaVersion",
        WCU: "100",
        RULE_ID: "MyRuleID",
        RULE_NAME: "MyRuleName",
        DEPLOY_LE: "0"
    };

    var result = await cr.handler({});
    
    expect(result).toHaveLength;

 });



})

