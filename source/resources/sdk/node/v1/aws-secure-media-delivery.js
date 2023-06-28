const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { SecretsManager } = require("@aws-sdk/client-secrets-manager");
const { fromIni } = require("@aws-sdk/credential-providers");
const { fromTemporaryCredentials } = require("@aws-sdk/credential-providers");
const b64url = require('base64url');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const qs = require('querystring');
const net = require('node:net');


function log(message){
    if(this._debug || this._debug == undefined) console.log("[DEBUG] " + message);
}

function getCredentialsAndRegion(params) {
    let credentials, region;
    if (params['profile']) {
        credentials = fromIni({ profile: params['profile'] });
    } else if (params['role']) {
        credentials = fromTemporaryCredentials({
            params: {
                RoleArn: params['role'],
                RoleSessionName: `SecureMediaDelivery-SDK-${Date.now()}`,
            },
        });
    }
    if (params['region']) {
        region = params['region'];
    } else if (!process.env.AWS_REGION) {
        region = 'us-east-1';
    }
    return {
        credentials,
        region,
    }
}

function expandIPv6(address){
    let hextets_abbrev = address.split(':');
    if (hextets_abbrev.slice(-1) == '') {
        hextets_abbrev.pop();  //when prefix ends with :: this creates two empty elements in an array
    }
    if (hextets_abbrev[0] == '') {
        hextets_abbrev.shift();  //when prefix starts with :: this creates two empty elements in an array
    }
    //add leading zeros in extets and expand two-collon (::) notation
    let hextets = hextets_abbrev.map(item => { return(item.length ? Array(5-item.length).join('0')+item : '')});
    if(hextets.indexOf('')>-1) {
        hextets.splice.apply(hextets,[hextets.indexOf(''),1].concat(Array(9-hextets.length).fill('0000')));
    }
    return hextets.join(':');
}

class Secret{

    static _debug = false;
    static logger = log;

    static setDEBUG(val=true){
        if(typeof(val)=='boolean'){
            this._debug = val;
        }
    }

    constructor(stackName, ttl, retrieveMode = 'native', retrieveFunction = null, retrieveFunctionArgs = []){
        this.keys = null;
        this._last_updated = null;
        this._lock = false;
        this.stackName = stackName;
        this._smClient = null;
        this.ttl = ttl;
        this.retrieveMode = retrieveMode;
        this.retrieveFunction = retrieveFunction;
        this.retrieveFunctionArgs = retrieveFunctionArgs;
    }

    initSMClient(params={}){
        try{
            this._smClient = new SecretsManager(getCredentialsAndRegion(params));
        } catch(e) {
            Secret.logger(`Couldn't create SecretsManager client: ${e}`);
            return false;
        }
        return true;
        
    }

    async _getSMSecret(){
        let secret_name_primary = `${this.stackName}_PrimarySecret`;
        let secret_name_secondary = `${this.stackName}_SecondarySecret`;
        let primarySecret_json;
        let secondarySecret_json;
        try{
            let sm_promise_primary = this._smClient.getSecretValue({SecretId: secret_name_primary});
            let sm_promise_secondary = this._smClient.getSecretValue({SecretId: secret_name_secondary});
            let smResponses = await Promise.all([sm_promise_primary,sm_promise_secondary]);
            primarySecret_json = Secret._getSecretKV(smResponses[0]);
            secondarySecret_json = Secret._getSecretKV(smResponses[1]);

        } catch (e){
            throw new Error(`Couldn't retrieve SecretsManager secrets: ${e}`);
        }        

        return {
            'primary': {
                'uuid': Object.keys(primarySecret_json)[0],
                'value': Object.values(primarySecret_json)[0]
            },
            'secondary': {
                'uuid': Object.keys(secondarySecret_json)[0],
                'value': Object.values(secondarySecret_json)[0]
            }
        }
                
    }

    getKeyValue(key_alias){
        return this.keys['key_alias'].value;
    }
    getKeyUUID(key_alias){
        return this.keys['key_alias'].uuid;
    }
    
    _checkIfExpired(){
        if(!this._last_updated){
            Secret.logger('Keys have not been set yet');
            return null;
        } else if(Math.floor(Date.now()/1000)-this._last_updated  > this.ttl) {
            return true;
        } else {
            return false;
        }

    }

    async retrieveKeys(key_alias = 'all'){
        let isExpired = this._checkIfExpired();
        if (this._last_updated && ((!isExpired) || this._lock)) {
            if (key_alias == 'all') {
                return this.keys;
            }
            return this.keys[key_alias];
        }

        Secret.logger('Starting key retrival');
        this._lock = true;
        try {
            if (this.retrieveMode == 'native') {
                //TO-DO: add timeout
                let provisional_keys = await this._getSMSecret();
                if (!Secret.validateKeys(provisional_keys)) {
                    throw new Error("Invalid format of the returned keys");
                }
                this.keys = provisional_keys;
                this._last_updated = Math.floor(Date.now() / 1000);
            } else if (this.retrieveMode == 'custom') {
                //TO-DO: add timeout
                let provisional_keys = await this.retrieveFunction(...this.retrieveFunctionArgs);
                if (!Secret.validateKeys(provisional_keys)) {
                    throw new Error("Invalid format of the returned keys");
                }
                this.keys = provisional_keys;
                this._last_updated = Math.floor(Date.now() / 1000);
            }
        } catch (e) {
            console.log(e);
            Secret.logger(`failed to retrieve the keys: ${e}`);
        } finally {
            this._lock = false;
        }

        if (this.keys) {
            if (key_alias == 'all') {
                return this.keys;
            }
            return this.keys[key_alias];
        }

        throw new Error("Key retrival failed and no previously set key is available");
    }

    static validateKeys(obj){
        let top_level_keys = Object.keys(obj);

        switch (top_level_keys.length) {
            case 1:
                let low_level_keys = Object.keys(obj['primary']);
                return Secret._validate_primary(top_level_keys, low_level_keys, obj['primary'].uuid, obj['primary'].value);

            case 2:
                return Secret._validate_secondary(top_level_keys, Object.entries(obj));

            default:
                return false;
        }
    }

    static _validate_primary(top_level_keys, low_level_keys, uuid, value) {
        if (!top_level_keys.includes('primary')) return false;
        if (low_level_keys.length != 2) return false
        if (!(low_level_keys.includes('uuid') && low_level_keys.includes('value'))) return false;
        return !(typeof (uuid) != 'string' || typeof (value) != 'string');
    }

    static _validate_secondary(top_level_keys, entries) {
        if (!(top_level_keys.includes('primary') && top_level_keys.includes('secondary'))) return false;
        for (const key of entries) {
            let low_level_keys = Object.keys(key[1]);
            if (low_level_keys.length != 2) return false
            if (!(low_level_keys.includes('uuid') && low_level_keys.includes('value'))) return false;
            if (typeof (key[1].uuid) != 'string' || typeof (key[1].value) != 'string') return false;
        }
        return true;
    }

    static _getSecretKV(smResponse){
        //returns key value object from either string or binary format of the secret
		let secret = null;
        if ('SecretString' in smResponse) {
            secret = smResponse.SecretString;
        } else {
            let buff = Buffer.from(smResponse.SecretBinary, 'base64');
            secret = buff.toString();
        }
        return JSON.parse(secret);
    }

}

class Session{
    static _debug = false;
    static logger = log;
    static _ddbClient = null;
    static revocationTable = '';

    static setDEBUG(val=true){ // NOSONAR - javascript:S4144 - functions are in separate classes. Issue is not significant enough to refactor.
        if(typeof(val)=='boolean'){
            this._debug = val;
        }
    }

    static initialize(tableName, params={}){
        this.revocationTable = tableName;
        this.initDBClient(params);
    }

    constructor(id=null, autogenerate=false, suspicion_score = 0){
        let sessionLength;
        if(id && autogenerate){
            if((sessionLength=parseInt(id)) > 6) {
                this.id = Session._autoGenerate(sessionLength);
            } else{
                throw new Error("Invalid id input while autogenerate set to true. It must be a number greater than 6");
            }
        } else if(id) {
            this.id = id;
        } else {
            this.id = Session._autoGenerate(12);
        }
        this.suspicion_score = suspicion_score;
    }

    async revoke(expiry_period=86400, reason='COMPROMISED'){
        if(!Session._ddbClient) throw new Error("DynamoDB client hasn't been initialized");
        if(!Session.revocationTable) throw new Error("Revocation Table name must be set");
        let currentTimestamp = Math.floor(Date.now()/1000);
        let expiryTime = currentTimestamp + expiry_period;
		
        let item= {
            'session_id': { 'S': this.id},
            'type': { 'S': 'MANUAL' },
			'score': {'N': this.suspicion_score.toString()},
            'reason': { 'S': reason },
            'last_updated' : { 'N': currentTimestamp.toString() },
            'ttl': { 'N': expiryTime.toString()}
        }

        let params = {
            Item: item,
            TableName: Session.revocationTable
        };
		
		try{
			await Session._ddbClient.putItem(params);
            return true;
		} catch(e){
            console.log("ERROR: "+e)
			Session.logger(`Manual session revoke operation failed when updating DynamoDB table: ${e}`);
            return false;
		}

    } 

    static initDBClient(params={}){
        try{
            this._ddbClient = new DynamoDB(getCredentialsAndRegion(params));
        } catch(e) {
            Session.logger(`Couldn't create DynamoDB client: ${e}`);
            return false;
        }
        return true;
    }


    static _autoGenerate(output_length){
        const chars = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890";
        return Array.from({length: output_length}, ()=>chars.charAt(crypto.randomInt(0,chars.length))).join('');
    }

}

class Token{
    
    static _debug = false;
    static logger = log;
    
    constructor(secret, defaultTokenPolicy=null){
        this.secret = secret;
        this.defaultTokenPolicy = defaultTokenPolicy;
    }
  
    static setDEBUG(val=true){ // NOSONAR - javascript:S4144 - functions are in separate classes. Issue is not significant enough to refactor.
        if(typeof(val)=='boolean'){
            this._debug = val;
        }
    }

    _sign(input, key, method){
        return b64url(crypto.createHmac(method, key).update(input).digest());
    }

    _populate_ip(viewer_attributes, jwt_payload) {
        let fullIP;
        if(viewer_attributes['ip'].includes('.') && net.isIPv4(viewer_attributes['ip'])){
            jwt_payload['ip_ver']=4;
            fullIP = viewer_attributes['ip'];
        } else if(net.isIPv6(viewer_attributes['ip'])){
            jwt_payload['ip_ver']=6;
            fullIP = expandIPv6(viewer_attributes['ip']);
        } else {
            throw new Error("Invalid viewer's IP format");
        }

        return { fullIP, jwt_payload };
    }

    _populate_boolean_items(token_policy, viewer_attributes, jwt_payload) {
        let intsig_input = '';
        if (token_policy['ip']) {
            const populated_ip = this._populate_ip(viewer_attributes, jwt_payload);
            jwt_payload = populated_ip.jwt_payload;
            
            jwt_payload['ip']=true;
            intsig_input += populated_ip.fullIP + ':';
        }

        if (token_policy['co']){
            jwt_payload['co']=true;
            intsig_input += viewer_attributes['co'] + ':';
            if(token_policy['co_fallback']) jwt_payload['co_fallback']=true;
        }

        if (token_policy['cty']){
            jwt_payload['cty']=true;
            intsig_input += viewer_attributes['cty'] + ':';
        }

        if (token_policy['reg']){
            jwt_payload['reg']=true;
            intsig_input += viewer_attributes['reg'] + ':';
            if(token_policy['reg_fallback']) jwt_payload['reg_fallback']=true;
        } 

        if (token_policy['ssn']){
            jwt_payload['ssn']=true;
            if (viewer_attributes['sessionId']) {
                this.payloadSsn = viewer_attributes['sessionId'];
            } else {
                let session = new Session(token_policy['session_auto_generate'],true);
                this.payloadSsn = session.id;
            }
            intsig_input += this.payloadSsn + ':';
        }

        return { jwt_payload, intsig_input };
    }

    _populate_exp(token_policy, jwt_payload) {
        if(token_policy['exp'].startsWith('+')){
            if(token_policy['exp'].endsWith('h')){
                jwt_payload['exp'] = parseInt(Date.now()/1000) + parseInt(token_policy['exp'].slice(1,-1))*3600;
            } else if(token_policy['exp'].endsWith('m')){
                jwt_payload['exp'] = parseInt(Date.now()/1000) + parseInt(token_policy['exp'].slice(1,-1))*60;
            } else {
                throw new Error("Invalid exp format");
            }
        } else {
            let parsedExp = parseInt(token_policy['exp']);
            if(parsedExp <= 0){
                throw new Error("Invalid exp format");
            }
            jwt_payload['exp'] = parsedExp;
        }

        return jwt_payload;
    }

    _populate_jwt_payload(token_policy, viewer_attributes, jwt_payload, playback_url_qs, secret_alias) {
        const boolean_items = this._populate_boolean_items(token_policy, viewer_attributes, jwt_payload);
        jwt_payload = boolean_items.jwt_payload;
        let intsig_input = boolean_items.intsig_input;
         
        if (token_policy['headers'] && token_policy['headers'].length){
            token_policy['headers'].forEach((header)=>{
                jwt_payload['headers'].push(header);
                if(viewer_attributes['headers'][header]) intsig_input += viewer_attributes['headers'][header] + ':';
            });
        }

        if (token_policy['querystrings'] && token_policy['querystrings'].length){
            token_policy['querystrings'].forEach((qs_param)=>{
                jwt_payload['qs'].push(qs_param);
                let qs_value = playback_url_qs[qs_param] || viewer_attributes['qs'][qs_param];
                if(qs_value) intsig_input += qs_value + ':';
            });
        }

        if(intsig_input){
			intsig_input = intsig_input.slice(0,-1);
			Token.logger("Input for internal signature: ", intsig_input); 
			jwt_payload['intsig'] = this._sign(intsig_input, secret_alias.value, 'sha256')
        } else {
			delete jwt_payload['intsig'];
		}

        jwt_payload['paths'] = token_policy['paths'];
        if (token_policy['exc']) jwt_payload['exc'] = token_policy['exc'];

        if (token_policy['nbf']) jwt_payload['nbf'] = parseInt(token_policy['nbf']);

        jwt_payload = this._populate_exp(token_policy, jwt_payload);
        

        return jwt_payload;
    }
    
    async generate(viewer_attributes, playback_url=null, token_policy = self.defaultTokenPolicy, secret_alias = 'primary'){
        let keys = await this.secret.retrieveKeys();
        if(!keys[secret_alias]) throw new Error("Provided secret alias can't be found in the retrived secret");
        let playback_url_qs = {};
        if(playback_url){
            playback_url_qs = qs.parse(playback_url);
        }

        let jwt_payload = {
            ip: false,
            co: false,
            cty: false,
            reg: false,
            ssn: false,
            exp: '',
            headers: [],
            qs: [],
            intsig: '',
            paths: [],
            exc: []
        }

        jwt_payload = this._populate_jwt_payload(token_policy, viewer_attributes, jwt_payload, playback_url_qs, keys[secret_alias]);

        this.encoded_jwt = jwt.sign( jwt_payload, keys[secret_alias].value, {algorithm: 'HS256', keyid: keys[secret_alias].uuid});

        if(playback_url){
            let playback_url_array = playback_url.split('/');
            playback_url_array.splice(3,0,`${this.payloadSsn?this.payloadSsn+'.':''}${this.encoded_jwt}`);
            this.output_playback_url = playback_url_array.join('/');
            return this.output_playback_url;
        }

        return `${this.payloadSsn?this.payloadSsn+'.':''}${this.encoded_jwt}`;
    }

}

exports.Token = Token;
exports.Secret = Secret;
exports.Session = Session;
