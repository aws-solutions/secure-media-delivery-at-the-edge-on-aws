/*********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

let fs = require("fs");
let path = require("path");
const zipLocal = require("zip-local");


const AWS = require('aws-sdk');
const lambda = process.env.METRICS == "true" ? new AWS.Lambda({ customUserAgent: process.env.SOLUTION_IDENTIFIER, region: 'us-east-1' }) : new AWS.Lambda({ region: 'us-east-1' });
const ssm = process.env.METRICS == "true" ? new AWS.SSM({ customUserAgent: process.env.SOLUTION_IDENTIFIER }) : new AWS.SSM();
const wafv2 = process.env.METRICS == "true" ? new AWS.WAFV2({ customUserAgent: process.env.SOLUTION_IDENTIFIER, region: 'us-east-1' }) : new AWS.WAFV2({ region: 'us-east-1' });


exports.handler = async (event, context) => {

    console.log("Event=" + JSON.stringify(event));

    await createWafRuleGroup();

    if (parseInt(process.env.DEPLOY_LE) == 1) {
        //deploy Lambda Edge only if the user selected API module in the wizard
        await createLambdaEdge();
    }

}

async function createLambdaEdge() {
    let functionArn = '';
    const le_zip_path = "/tmp/lambda_edge.zip";
    const le_path = "./le.js";
    const tmp_le_path = "/tmp/le.js";
    const code_path = path.resolve(le_zip_path)
    try {
        //zipping le.js
        console.log("copy " + le_path + " to " + tmp_le_path);
        fs.copyFileSync(le_path, tmp_le_path);

        console.log("zipping " + tmp_le_path + " into " + le_zip_path)
        zipLocal.sync.zip(tmp_le_path).compress().save(le_zip_path);
        console.log("zip created");
        // Creates Edge Lambda
        const params = {
            Code: {
                ZipFile: fs.readFileSync(code_path)
            },
            FunctionName: process.env.STACK_NAME + '_Sig4LE', /* required */
            Handler: 'le.handler', /* required */
            Role: process.env.ROLE_ARN, /* required */
            Runtime: 'nodejs14.x', /* required */
            Description: 'Sign sign4 requests'
        };

        let result = await lambda.createFunction(params).promise();
        functionArn = result.FunctionArn;
        await publishLEVersion(functionArn);
    } catch (error) {
        if (error.name === "ResourceConflictException") {
            console.log("LambdaEdge exist already. Nothing to do.")
        } else {
            console.error(error);
            throw new Error('Creating Edge Lambda failed.');
        }

    }


}

async function publishLEVersion(functionArn) {
    // Publishes Edge Lambda version
    try {
        let isFunctionStateActive = false
        let retry = 0
        let delayinMilliseconds = 5000;
        while (!isFunctionStateActive) {
            let response = await lambda.getFunctionConfiguration({
                FunctionName: functionArn
            }).promise();
            console.log(`Response from get function configuration ${JSON.stringify(response)}`)
            if (response.State === 'Active' || retry > 10) {
                isFunctionStateActive = true
            } else {
                await waitForTime(delayinMilliseconds)
                retry++
                delayinMilliseconds += 5000;
            }
        }

        let params = {
            FunctionName: functionArn
        };

        let result = await lambda.publishVersion(params).promise();
        await saveToSSM(process.env.LAMBDA_VERSION, `${functionArn}:${result.Version}`)

    } catch (error) {
        console.error(error);
        throw Error('Publishing Edge Lambda version failed.');
    }
}

async function createWafRuleGroup() {
    try {
        // Creates WAF Rule Group
        const params = {
            Capacity: parseInt(process.env.WCU),
            Name: process.env.RULE_NAME,
            Scope: 'CLOUDFRONT',
            VisibilityConfig: {
                CloudWatchMetricsEnabled: false,
                MetricName: "metricName",
                SampledRequestsEnabled: false,
            },
            Description: "Revoked sessions",
            Rules: [],
        };

        let result = await wafv2.createRuleGroup(params).promise();
        await saveToSSM(process.env.RULE_ID, result.Summary.Id)

    } catch (error) {
        if (error.name === "WAFDuplicateItemException") {
            console.log("The rule group exist already. Nothing to do.")
        } else {
            console.error(error);
            throw Error('Creating WAF Rule group failed.');
        }
    }
}

async function saveToSSM(paramName, paramValue) {
    console.log('Saving to SSM...');

    const params = {
        Name: paramName,
        Value: paramValue,
        Type: 'String',
        Overwrite: true
    };
    const request = await ssm.putParameter(params).promise();
    return request.Parameter;
}

// Function to add delay for waiting on process
const waitForTime = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};