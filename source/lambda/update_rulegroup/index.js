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

const aws = require('aws-sdk');

const wafv2 = process.env.METRICS == "true" ? new aws.WAFV2({ region: 'us-east-1', customUserAgent: process.env.SOLUTION_IDENTIFIER }) : new aws.WAFV2({ region: 'us-east-1' });
const dynamodb = process.env.METRICS == "true" ? new aws.DynamoDB({customUserAgent: process.env.SOLUTION_IDENTIFIER}) : new aws.DynamoDB();


const crypto = require("crypto");

function getFormattedRuleConfig(sessionId, ruleName, priority) {
    return {
        "Name": ruleName,
        "Priority": priority,
        "Statement": {
            "ByteMatchStatement": {
                "SearchString": sessionId,
                "FieldToMatch": {
                    "UriPath": {

                    }
                },
                "TextTransformations": [
                    {
                        "Priority": 0,
                        "Type": "NONE"
                    }
                ],
                "PositionalConstraint": "STARTS_WITH"
            }
        },
        "Action": {
            "Block": {

            }
        },
        "VisibilityConfig": {
            "SampledRequestsEnabled": true,
            "CloudWatchMetricsEnabled": true,
            "MetricName": "Example"
        }
    }

}

async function getCurrentRules() {

    const params = {
        Id: process.env.RULE_ID,
        Name: process.env.RULE_NAME,
        Scope: 'CLOUDFRONT'
    };
    return wafv2.getRuleGroup(params).promise()
}

async function updateRules(visibility, lockToken, rules) {
    console.log("Update rule group");
    const params = {
        Name: process.env.RULE_NAME,
        Id: process.env.RULE_ID,
        Description: "TokenRevoke",
        Scope: "CLOUDFRONT",
        VisibilityConfig: visibility,
        LockToken: lockToken,
        Rules: rules
    };
    return wafv2.updateRuleGroup(params).promise();

}

async function querySessions() {

    const nowDate = new Date();
    const retentionDateTime = new Date(nowDate.getTime() - parseInt(process.env.RETENTION) * 60000);

    const retentionEpochTimestamp = Math.round(retentionDateTime.getTime() / 1000)


    const params = {
        IndexName: process.env.GSI_INDEX_NAME,
        ExpressionAttributeValues: {
            ':r': { S: 'COMPROMISED' },
            ':l': { N: String(retentionEpochTimestamp) }
        },
        KeyConditionExpression: 'reason = :r and last_updated >= :l',
        TableName: process.env.TABLE_NAME
    };

    return dynamodb.query(params).promise();
}

function getRandomAlphanumericString() {
    return crypto.randomBytes(8).toString('hex');

}

exports.handler = async (event, context) => {
    console.log("event=" + JSON.stringify(event));

    const result = await querySessions();
    var globalIndex = 1
    var localIndex = 1
    var rules = []
    const maxSessions = parseInt(process.env.MAX_SESSIONS)/2;
    if (result['Items']) {
        const items = result['Items'];
        console.log(`${items.length} Sessions IDs from DynamoDB to process`)

        //look for manual sessions
        const manualSessions = items.filter(function (e) {
            return e['type']['S'] == 'MANUAL';
        });

        //look for auto sessions
        const autoSessions = items.filter(function (e) {
            return e['type']['S'] == 'AUTO';
        });

        const sortedAutoSessions = autoSessions.sort((a, b) => {
            return b['score']['N'] - a['score']['N'];
        });

        for (const item of manualSessions) {

            if (globalIndex <= maxSessions) {
                var myRuleName = String(getRandomAlphanumericString())
                const currentRule1 = getFormattedRuleConfig('/' + item['session_id']['S'], myRuleName, globalIndex)
                rules.push(currentRule1)
                globalIndex += 1
                localIndex += 1
            } else {
                console.log("Max items added to rule group reached, stopping iteration through results from dynamodb")
                break
            }
            console.log(`${(localIndex - 1)} MANUAL Sessions IDs to add to Rule Group`)

            localIndex = 1
        }

        for (const item of sortedAutoSessions) {
            if (globalIndex <= maxSessions) {
                myRuleName = String(getRandomAlphanumericString())
                const currentRule2 = getFormattedRuleConfig('/' + item['session_id']['S'], myRuleName, globalIndex)
                rules.push(currentRule2)
                globalIndex += 1
                localIndex += 1
            }
            else {
                console.log("Max items added to rule group reached, stopping iteration through results from dynamodb")
                break
            }
            console.log(`${(localIndex - 1)} AUTO Sessions IDs to add to Rule Group`)
        }

        console.log(`${(globalIndex - 1)} Sessions IDs from DynamoDB to attach to rule group`)
        if (rules.length > 0) {
            const attachedRules = await getCurrentRules();
            await updateRules(attachedRules['RuleGroup']['VisibilityConfig'], attachedRules['LockToken'], rules)
        }

    } else {
        console.log("No Session ID from DynamoDB Table. Nothing to do.")
    }


    return {
        'statusCode': 200,
        'body': JSON.stringify("Revoked sessions: ")
    }

};