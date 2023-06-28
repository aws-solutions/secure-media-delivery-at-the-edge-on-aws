const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const dynamodb = process.env.METRICS == "true" ?  DynamoDBDocument.from(new DynamoDB({customUserAgent: process.env.SOLUTION_IDENTIFIER})) :  DynamoDBDocument.from(new DynamoDB());
 

exports.handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event));
    try {
        const ip = parseInt(event.queryStringParameters.ip);
        const ua = parseInt(event.queryStringParameters.ua);
        const referer = parseInt(event.queryStringParameters.referer);
        console.log(event.queryStringParameters);

        const tokenHeaders=[];
        if(ua==1){
            tokenHeaders.push("user-agent")
        }

        if(referer==1){
            tokenHeaders.push("referer")
        }

        const tokenIp =  ip==1 ? true : false;

        console.log(tokenHeaders);
        console.log(tokenIp);
            
        const params = {
            TableName: process.env.TABLE_NAME,
            Key: {
                id: String(event.queryStringParameters.id),
            },
            UpdateExpression: "set token_policy.headers = :myHeaders, token_policy.ip = :myIp ",
            ExpressionAttributeValues: {
                ":myHeaders": tokenHeaders,
                ":myIp": tokenIp
            },
            ReturnValues: "UPDATED_NEW",
        };

        console.log(JSON.stringify(params));
        await dynamodb.update(params);

        return {
            statusCode: 200,
            body: "Token updated"
        };
    } catch (error) {
        console.log(error);
        return {
            statusCode: 400,
            body: "Error when updating the token"
        };
    }
    
};
