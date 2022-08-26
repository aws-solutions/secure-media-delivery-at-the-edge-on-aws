const cr = require('../lambda/custom_resource_us_east_1/index.js');
jest.mock("aws-sdk")

import fs from 'fs';

const spy = jest.spyOn(fs, 'copyFileSync').mockImplementation(() => { 
    return ``;
 });


describe('Custom resource', () => {

    const env = process.env

    beforeEach(  ()   =>   {

        let data = "Mocked content of my file";

        fs.writeFileSync("/tmp/le.js", data);

        jest.resetModules()
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
        process.env = env
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

