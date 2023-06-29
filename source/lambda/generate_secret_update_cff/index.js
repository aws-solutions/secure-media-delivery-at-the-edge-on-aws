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
 const { CloudFront } = require("@aws-sdk/client-cloudfront");
 const { SecretsManager } = require("@aws-sdk/client-secrets-manager");

 
 const secretsmanager = process.env.METRICS == "true" ? new SecretsManager({customUserAgent: process.env.SOLUTION_IDENTIFIER}) : new SecretsManager();
 const cloudfront = process.env.METRICS == "true" ?  new CloudFront({customUserAgent: process.env.SOLUTION_IDENTIFIER}) :  new CloudFront();


 const crypto = require("crypto");
 const fs = require('fs');
 
 
 
 function generateSecretKey() {
 
     const randomKeySuffix = crypto.randomBytes(10).toString('hex');
     const dateObj = new Date();
     const month = String(dateObj.getMonth() + 1).padStart(2, '0');
     const day = String(dateObj.getUTCDate());
     const year = String(dateObj.getUTCFullYear());
 
     const nowDate = year + month + day;
     return nowDate + '_' + randomKeySuffix;
 }
 
 function generateSecretValue() {
 
     return crypto.randomBytes(64).toString('hex');
 }
 
 async function getCffUpdatedCode(secret1Key, secret1Value, secret2Key, secret2Value) {
 
     let newContent = "";
     const allFileContents = fs.readFileSync('cff.js', 'utf-8');
     allFileContents.split(/\r?\n/).forEach(line => {
         let newLine;
 
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
 
     let params = {
         Name: process.env.CFF_NAME
     };
 
     let response = await cloudfront.describeFunction(params);
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
 
     response = await cloudfront.updateFunction(params);
     console.log("response = "+JSON.stringify(response));
     
     console.log("Publish CloudFront Function");
     params = {
         IfMatch: response['ETag'],
         Name: process.env.CFF_NAME
     };
     await cloudfront.publishFunction(params);
 
 
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
         const objectTemporary = {};
         objectTemporary[newSecretKey] = newSecretValue;
         let params = {
             SecretId: temporaryKeyName,
             SecretString: JSON.stringify(objectTemporary)
         };
 
         await secretsmanager.putSecretValue(params);
 
         console.log("Initialize primary secret")
 
         //update primary secret  with a new value
         const newPrimarySecretKey = generateSecretKey();
         const newPrimarySecretValue = generateSecretValue();
         const objectPrimary = {};
         objectPrimary[newPrimarySecretKey] = newPrimarySecretValue;
         params = {
             SecretId: primaryKeyName,
             SecretString: JSON.stringify(objectPrimary)
         };
 
         await secretsmanager.putSecretValue(params);
 
         console.log("Initialize temporary secret")
 
         //update secondary secret  with a new value
         const newSecondarySecretKey = generateSecretKey();
         const newSecondarySecretValue = generateSecretValue();
         const objectSecondary = {};
         objectSecondary[newSecondarySecretKey] = newSecondarySecretValue;
         params = {
             SecretId: secondaryKeyName,
             SecretString: JSON.stringify(objectSecondary)
         };
 
         await secretsmanager.putSecretValue(params);
 
 
         await getCffUpdatedCode(newPrimarySecretKey, newPrimarySecretValue, newSecondarySecretKey, newSecondarySecretValue);
 
 
     } else {
         //Lambda triggered by the SF to rotate the secrets
 
         // Update temporary secret with a new value
         const newSecretKey = generateSecretKey();
         const newSecretValue = generateSecretValue();
         const objectTemporary = {};
         objectTemporary[newSecretKey] = newSecretValue;
 
         let params = {
             SecretId: temporaryKeyName,
             SecretString: JSON.stringify(objectTemporary)
         };
 
         await secretsmanager.putSecretValue(params);
 
         //get primary secret
         params = {
             SecretId: primaryKeyName
         };
 
         const responseSecret = await secretsmanager.getSecretValue(params);
 
         const primarySecretAsJson = JSON.parse(responseSecret.SecretString);
 
         const primarySecretKeyName = Object.keys(primarySecretAsJson)[0];
         const primarySecretKeyValue = Object.values(primarySecretAsJson)[0];
 
         await getCffUpdatedCode(newSecretKey, newSecretValue, primarySecretKeyName, primarySecretKeyValue);
 
     }
 
 
 
     return "OK";
 
 };