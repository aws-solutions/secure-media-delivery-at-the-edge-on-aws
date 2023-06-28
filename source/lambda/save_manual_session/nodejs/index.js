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

const awsSMD = require("aws-secure-media-delivery");

const tableName = process.env.TABLE_NAME;
const TTL = process.env.TTL;

awsSMD.Session.setDEBUG(true);
awsSMD.Session.initialize(tableName);

const response400 = {
    statusCode: 400,
    body: "Bad request"
}

const response200 = {
    statusCode: 200,
    body: "Session submitted to the revocation list"
}

exports.handler = async (event, context) => {
    console.log("event="+JSON.stringify(event));

    let id;
    
    if(event['queryStringParameters'] && event.queryStringParameters['sessionid']){
        id = event.queryStringParameters['sessionid'];
        if(!/^\w+$/.test(id) || (id.length > 200)) return response400;
    } else {
        return response400;
    }
    
    let revokeSession = new awsSMD.Session(id);
    let result = await revokeSession.revoke(TTL*86400);
    return result ? response200 : response400;
    
};