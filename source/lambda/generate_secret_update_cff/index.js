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

 
 const secretsmanager = process.env.METRICS == "true" ? new aws.SecretsManager({customUserAgent: process.env.SOLUTION_IDENTIFIER}) : new aws.SecretsManager();
 const cloudfront = process.env.METRICS == "true" ?  new aws.CloudFront({customUserAgent: process.env.SOLUTION_IDENTIFIER}) :  new aws.CloudFront();


 const crypto = require("crypto");
 const fs = require('fs');
 
 
 
 function generateSecretKey() {
 
     const randomKeySuffix = crypto.randomBytes(10).toString('hex');
     const dateObj = new Date();
     const month = String(dateObj.getMonth() + 1).padStart(2, '0');
     const day = String(dateObj.getUTCDate());
     const year = String(dateObj.getUTCFullYear());
 
     var nowDate = year + month + day;
     return nowDate + '_' + randomKeySuffix;
 }
 
 function generateSecretValue() {
 
     return crypto.randomBytes(64).toString('hex');
 }
 
 async function getCffUpdatedCode(secret1Key, secret1Value, secret2Key, secret2Value) {
 
     var newContent = "";
     const allFileContents = fs.readFileSync('cff.js', 'utf-8');
     allFileContents.split(/\r?\n/).forEach(line => {
         var newLine = "";
 
         line = line.trim()
 
         if (line.startsWith('var secrets = '))
             newLine = "var secrets = { \"" + secret1Key + "\" : \"" + secret1Value + "\", \"" + secret2Key + "\": \"" + secret2Value + "\" }";
         else if (line.startsWith('exports.handler') || (line.startsWith('exports.decodeString')))
             newLine = "";
         else if (line.includes("return exports.decodeString(str)"))
             newLine = line.replace("exports.", "");
         else
             newLine = line;
 
         newContent = newContent + newLine + "\n";
 
 
 
     });
 
     return updateCff(newContent);
 
 }
 
 async function updateCff(functionCodeAsStr) {
 
     console.log("Get ETAG for CloudFront Function " + process.env.CFF_NAME);
 
     var params = {
         Name: process.env.CFF_NAME
     };
 
     var response = await cloudfront.describeFunction(params).promise();
     console.log("Update CloudFront Function Code");
     params = {
         FunctionCode: Buffer.from(functionCodeAsStr),
         FunctionConfig: {
             'Comment': 'CloudFront Function Token validator',
             'Runtime': 'cloudfront-js-1.0'
         },
         IfMatch: response['ETag'],
         Name: process.env.CFF_NAME
     };
 
     response = await cloudfront.updateFunction(params).promise();
     console.log("response = "+JSON.stringify(response));
     
     console.log("Publish CloudFront Function");
     params = {
         IfMatch: response['ETag'],
         Name: process.env.CFF_NAME
     };
     await cloudfront.publishFunction(params).promise();
 
 
     console.log("Cloudfront Function updated");
 
 }
 
 exports.handler = async (event, context) => {
     console.log("event=" + JSON.stringify(event));
     const temporaryKeyName = process.env.TEMPORARY_KEY_NAME;
     const primaryKeyName = process.env.PRIMARY_KEY_NAME;
     const secondaryKeyName = process.env.SECONDARY_KEY_NAME;
 
     if (event.initialize) {
         //Lambda triggered by the custom resource on deploy
         console.log("Initialize temporary secret")
 
         //update temporary secret  with a new value
         const newSecretKey = generateSecretKey();
         const newSecretValue = generateSecretValue();
         var objectTemporary = {};
         objectTemporary[newSecretKey] = newSecretValue;
         var params = {
             SecretId: temporaryKeyName,
             SecretString: JSON.stringify(objectTemporary)
         };
 
         await secretsmanager.putSecretValue(params).promise();
 
         console.log("Initialize primary secret")
 
         //update primary secret  with a new value
         var newPrimarySecretKey = generateSecretKey();
         var newPrimarySecretValue = generateSecretValue();
         var objectPrimary = {};
         objectPrimary[newPrimarySecretKey] = newPrimarySecretValue;
         params = {
             SecretId: primaryKeyName,
             SecretString: JSON.stringify(objectPrimary)
         };
 
         await secretsmanager.putSecretValue(params).promise();
 
         console.log("Initialize temporary secret")
 
         //update secondary secret  with a new value
         var newSecondarySecretKey = generateSecretKey();
         var newSecondarySecretValue = generateSecretValue();
         var objectSecondary = {};
         objectSecondary[newSecondarySecretKey] = newSecondarySecretValue;
         params = {
             SecretId: secondaryKeyName,
             SecretString: JSON.stringify(objectSecondary)
         };
 
         await secretsmanager.putSecretValue(params).promise();
 
 
         await getCffUpdatedCode(newPrimarySecretKey, newPrimarySecretValue, newSecondarySecretKey, newSecondarySecretValue);
 
 
     } else {
         //Lambda triggered by the SF to rotate the secrets
 
         // Update temporary secret with a new value
         const newSecretKey = generateSecretKey();
         const newSecretValue = generateSecretValue();
         var objectTemporary = {};
         objectTemporary[newSecretKey] = newSecretValue;
 
         var params = {
             SecretId: temporaryKeyName,
             SecretString: JSON.stringify(objectTemporary)
         };
 
         await secretsmanager.putSecretValue(params).promise();
 
         //get primary secret
         params = {
             SecretId: primaryKeyName
         };
 
         var responseSecret = await secretsmanager.getSecretValue(params).promise();
 
         var primarySecretAsJson = JSON.parse(responseSecret.SecretString);
 
         var primarySecretKeyName = Object.keys(primarySecretAsJson)[0];
         var primarySecretKeyValue = Object.values(primarySecretAsJson)[0];
 
         await getCffUpdatedCode(newSecretKey, newSecretValue, primarySecretKeyName, primarySecretKeyValue);
 
     }
 
 
 
     return "OK";
 
 };