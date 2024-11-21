// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { WAFV2 } = require("@aws-sdk/client-wafv2");

const wafv2 = process.env.METRICS == "true" ? new WAFV2({ region: 'us-east-1', customUserAgent: process.env.SOLUTION_IDENTIFIER }) : new WAFV2({ region: 'us-east-1' });
const dynamodb = process.env.METRICS == "true" ? new DynamoDB({customUserAgent: process.env.SOLUTION_IDENTIFIER}) : new DynamoDB();


const crypto = require("crypto");

function getFormattedRuleConfig(sessionId, ruleName, priority) {
    return {
        "Name": ruleName,
        "Priority": priority,
        "Statement": {
            "ByteMatchStatement": {
                "SearchString": Buffer.from(sessionId),
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
    return wafv2.getRuleGroup(params);
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
    return wafv2.updateRuleGroup(params);

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

    return dynamodb.query(params);
}

function getRandomAlphanumericString() {
    return crypto.randomBytes(8).toString('hex');

}

exports.handler = async (event, context) => {
    console.log("event=" + JSON.stringify(event));

    const result = await querySessions();
    if (!result['Items']) {
        console.log("No Session ID from DynamoDB Table. Nothing to do.")
    } else {
        let globalIndex = 1
        let localIndex
        let rules = []
        const maxSessions = parseInt(process.env.MAX_SESSIONS) / 2;
        
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

        autoSessions.sort((a, b) => {
            return b['score']['N'] - a['score']['N'];
        });

        localIndex = 1
        for (const item of manualSessions) {
            if (globalIndex > maxSessions) {
                console.log("Max items added to rule group reached, stopping iteration through results from dynamodb")
                break
            }

            const myRuleName = String(getRandomAlphanumericString())
            const currentRule1 = getFormattedRuleConfig('/' + item['session_id']['S'], myRuleName, globalIndex)
            rules.push(currentRule1)
            globalIndex += 1
            localIndex += 1

            console.log(`${(localIndex - 1)} MANUAL Sessions IDs to add to Rule Group`)
        }

        localIndex = 1
        for (const item of autoSessions) {
            if (globalIndex <= maxSessions) {
                const myRuleName = String(getRandomAlphanumericString())
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

    }


    return {
        'statusCode': 200,
        'body': JSON.stringify("Revoked sessions: ")
    }

};