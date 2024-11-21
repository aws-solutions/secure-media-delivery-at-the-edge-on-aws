// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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