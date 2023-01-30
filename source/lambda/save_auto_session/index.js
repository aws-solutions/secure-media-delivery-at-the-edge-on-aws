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
const dynamodb = process.env.METRICS == "true" ?  new aws.DynamoDB({customUserAgent: process.env.SOLUTION_IDENTIFIER}) :  new aws.DynamoDB();
 

exports.handler = async (event, context) => {
    console.log("event="+JSON.stringify(event));
    if(Array.isArray(event) && event.length >1){
        console.log("number of elements:"+(event.length-1));
        const SECONDS_IN_AN_HOUR = 60 * 60;
        const currentTimestamp = Math.round(Date.now() / 1000);
        const expirationTime = currentTimestamp + 24 * SECONDS_IN_AN_HOUR * parseInt(process.env.TTL);
        for( const item of event.slice(1) ){
            
            const myItem = {
                'session_id': { 'S': item['Data'][0]['VarCharValue']},
                'type': { 'S': 'AUTO' },
                'reason': { 'S': 'COMPROMISED' },
                'score' : { 'N': item['Data'][1]['VarCharValue']},
                'ip_rate' : { 'N': item['Data'][2]['VarCharValue']},
                'ip_penalty' : { 'N': item['Data'][3]['VarCharValue']},
                'referer_penalty' : { 'N': item['Data'][4]['VarCharValue']},
                'ua_penalty' : { 'N': item['Data'][5]['VarCharValue']},
                'last_updated' : { 'N': String(currentTimestamp) },
                'ttl': { 'N': String(expirationTime)}
            }    
            await dynamodb.putItem({
                "TableName": process.env.TABLE_NAME,
                "Item": myItem
            }).promise()
            console.log(`Item inserted, sessionid=${item['Data'][0]['VarCharValue']}`);            
            
        }
        return "OK";
    }else{
        
        throw new Error('Event received must be an array with at least 2 elements');
    }
    
    
};