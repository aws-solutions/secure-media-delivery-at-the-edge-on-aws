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
 
 const { SecretsManager } = require("@aws-sdk/client-secrets-manager");
 const secretsmanager = process.env.METRICS == "true" ? new SecretsManager({customUserAgent: process.env.SOLUTION_IDENTIFIER}) : new SecretsManager();
 
 
 
 
 exports.handler = async (event, context) => {
     console.log("event="+JSON.stringify(event));
     
     const temporaryKeyName = process.env.TEMPORARY_KEY_NAME;
     const primaryKeyName = process.env.PRIMARY_KEY_NAME;
     const secondaryKeyName = process.env.SECONDARY_KEY_NAME;
 
     //get temporary secret
     let params = {
         SecretId: temporaryKeyName
     };
 
     let responseSecret = await secretsmanager.getSecretValue(params);
     console.log(responseSecret);
 
     const temporarySecretAsJson = JSON.parse(responseSecret.SecretString);
     const temporarySecretKeyName = Object.keys(temporarySecretAsJson)[0];
     const temporarySecretKeyValue = Object.values(temporarySecretAsJson)[0];
     
     //get primary secret
     params = {
         SecretId: primaryKeyName
     };
 
     responseSecret = await secretsmanager.getSecretValue(params);
     
     const primarySecretAsJson = JSON.parse(responseSecret.SecretString);
     const primarySecretKeyName = Object.keys(primarySecretAsJson)[0];
     const primarySecretKeyValue = Object.values(primarySecretAsJson)[0];
 
     const objectSecondary = {};
     objectSecondary[primarySecretKeyName] = primarySecretKeyValue;

     //set primary value to secondary secret
     params = {
         SecretId: secondaryKeyName, 
         SecretString: JSON.stringify(objectSecondary)
     };
     await secretsmanager.putSecretValue(params);
 
     const objectPrimary = {};
     objectPrimary[temporarySecretKeyName] = temporarySecretKeyValue;

     //set temporary value to primary secret
     params = {
         SecretId: primaryKeyName, 
         SecretString: JSON.stringify(objectPrimary)
     };
 
     await secretsmanager.putSecretValue(params);
 
     const objectTemporary = {};
     objectTemporary["INITIALIZED_KEY"] = "INITIALIZED_VALUE";

     //delete the temporary keys
     params = {
         SecretId: temporaryKeyName, 
         SecretString: JSON.stringify(objectTemporary)
     };

     await secretsmanager.putSecretValue(params);

 
     return "OK";
     
     
 };