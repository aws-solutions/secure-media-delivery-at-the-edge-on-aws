const generateSecrets = require('../lambda/generate_secret_update_cff/index.js');
jest.mock("aws-sdk")

import fs from 'fs';

const spy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => { 
    return `
    var secrets = { "secret1_key_to_replace": "secret1_value_to_replace", "secret2_key_to_replace": "secret2_value_to_replace"};
    function _base64urlDecode(str) {
        return exports.decodeString(str);//'exports' non supported by CFF. Only used to run unit tests. Removed before deployment.
    }
    
    `;
 });



describe('process.env', () => {
  const env = process.env

  beforeEach(() => {
      jest.resetModules()
      process.env = {  
        TEMPORARY_KEY_NAME: "MyTemporarySecretKey",
        PRIMARY_KEY_NAME: "MyPrimarySecretKey",
        SECONDARY_KEY_NAME: "MySecondarySecretKey",
        CFF_NAME: "MyCffName",
    };
  })

  afterEach(() => {
      process.env = env
  })



  test('Generate new temporary secret - result OK', async () => {

    var result = await generateSecrets.handler({});
    expect(result).toEqual("OK");

 });


 test('Initialize all secrets - result OK', async () => {

    var result = await generateSecrets.handler({"initialize": true});
    console.log("my result="+JSON.stringify(result));
    expect(result).toEqual("OK");

 });





})

