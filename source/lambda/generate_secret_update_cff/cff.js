// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

//DO NOT CHANGE THIS LINE
var secrets = { "secret1_key_to_replace": "secret1_value_to_replace", "secret2_key_to_replace": "secret2_value_to_replace"}; // nosonar
// END

//DEBUG FLAG
var DEBUG = true; // nosonar

var crypto = require('crypto'); // nosonar

//Response when JWT is not valid.
var response401 = { // nosonar
    statusCode: 401,
    statusDescription: 'Unauthorized'
};

function logToConsole(message){
    if(DEBUG) console.log(message);
}


function checkJWTToken(token, uri, session_id, http_headers, querystrings, ip, noVerify) { // nosonar

    // check segments
    var segments = token.split('.'); // nosonar
    if (segments.length !== 3) {
        throw new Error('Not enough or too many segments in JWT token');
    }

    // All segment should be base64url
    var headerSeg = segments[0]; // nosonar
    var payloadSeg = segments[1]; // nosonar
    var signatureSeg = segments[2]; // nosonar

    // base64url decode and parse JSON
    var header; // nosonar
    var payload; // nosonar


    try{    
        header = JSON.parse(_base64urlDecode(headerSeg));
        payload = JSON.parse(_base64urlDecode(payloadSeg));

    } catch(e){
        console.log(e);
        throw new Error('malformed JWT token');
    }

    if (!noVerify) {
        var alg = header['alg']; // nosonar
        var signingMethod; // nosonar
        var signingType; // nosonar

        if (alg=='HS256'){
            signingMethod = 'sha256';
            signingType = 'hmac';
        } else {
            throw new Error('Missing or unsupported signing algorithm in JWT header');
        }

        // Verify signature. `sign` will return base64 string.
        var signingInput = [headerSeg, payloadSeg].join('.'); // nosonar
        if (!_verify_signature(signingInput, secrets[header.kid], signingMethod, signingType, signatureSeg)) {
            throw new Error('JWT signature verification failed');
        }

        if (payload.exp && Date.now() > payload.exp*1000) {
            logToConsole(`JWT expiry: ${payload.exp}, current time: ${Date.now}`);
            throw new Error('Token expired');
        }

        if (payload.nbf && Date.now() < payload.nbf*1000) {
            logToConsole(`JWT nbf: ${payload.nbf}, current time: ${Date.now}`);
            throw new Error('Token not yet valid');
        }


        //check if request URL is not in the exclusion list and omit remaining validations if so
        for (var i=0; i<payload.exc.length; i++){ // nosonar
            if (uri.startsWith(payload.exc[i])) {
                return payload;
            }
        }

        //validate if the request URL matches paths covered by the token
        var uri_match = false; // nosonar
        for (var j=0; j<payload.paths.length; j++){ // nosonar
            if (uri.startsWith(payload.paths[j])) {
                    uri_match = true;
                break;
            }
        }
        if (!uri_match) {
            logToConsole(`request uri: ${uri}`)
            throw new Error('URI path doesn\'t match any path in the token');
        }

        var full_ip; // nosonar
        if(payload['ip']){
            if(!payload['ip_ver']) throw new Error("Missing ip_ver claim required when ip claim is set to true");
            if(parseInt(payload['ip_ver']) != 4 && parseInt(payload['ip_ver'] != 6)) throw new Error("Incorrect ip_ver claim value. Must be either 4 or 6");
            if(ip.includes('.')){
                if(payload['ip_ver'] != 4) throw new Error("Viewer's IP version (4) doesn't match ip_ver claim");
                full_ip = ip;
            } else if(ip.includes(':')){
                if(payload['ip_ver'] != 6) throw new Error("Viewer's IP version (6) doesn't match ip_ver claim");
                var hextets = ip.split(':').map(item => { return(item.length ? Array(5-item.length).join('0')+item : '')}); // nosonar
                full_ip = hextets.join(':');
            } else {
                throw new Error("Viewer's IP version not recognized");
            }
        }

        if (payload['intsig'] && !_verify_intsig(payload, secrets[header.kid], signingMethod, signingType, session_id, http_headers, querystrings, full_ip)) {
            throw new Error('Internal signature verification failed');
        }

    }

}

function _verify_intsig(payload_jwt, intsig_key, method, type, sessionId, request_headers, request_querystrings, request_ip) { // nosonar
    var indirect_attr = ''; // nosonar

    //recreating signing input based on JWT payload claims and request attributes
    if (payload_jwt['ip']){
        if (request_ip){
            indirect_attr += (request_ip + ':');
        } else {
            throw new Error('intsig reference error: Request IP is missing');
        }
    }

    if (payload_jwt['co']){
        if (request_headers['cloudfront-viewer-country']){
            indirect_attr += (request_headers['cloudfront-viewer-country'].value + ':');
        } else if(payload_jwt['co_fallback']) {
            logToConsole("Viewer country header missing but co_fallback set to true. Skipping internal signature verification");
            return true;
        } else {
            throw new Error('intsig reference error: cloudfront-viewer-country header is missing');
        }
    }

    if (payload_jwt['reg']){
        if (request_headers['cloudfront-viewer-country-region']){
            indirect_attr += (request_headers['cloudfront-viewer-country-region'].value + ':');
        } else if(payload_jwt['reg_fallback']) {
            logToConsole("Viewer country region header missing but reg_fallback set to true. Skipping internal signature verification");
            return true;
        } else {
            throw new Error('intsig reference error: cloudfront-viewer-country-region header is missing');
        }
    }

    if (payload_jwt['ssn']){
        if (sessionId){
            indirect_attr += sessionId + ':';
        } else {
            throw new Error('intsig reference error: Session id is missing');
        }

    }

    if(payload_jwt['headers']) payload_jwt.headers.forEach( attribute => {
        if (request_headers[attribute]){
            indirect_attr += (request_headers[attribute].value + ':' );
        }
    });

    if(payload_jwt['qs']) payload_jwt.qs.forEach( attribute => {
        if (request_querystrings[attribute]){
            indirect_attr += (request_querystrings[attribute].value + ':' );
        }
     });
    indirect_attr = indirect_attr.slice(0,-1);

    if (indirect_attr && !_verify_signature(indirect_attr, intsig_key, method, type, payload_jwt['intsig'])) {
        logToConsole("Indirect attributes input string:" + indirect_attr);
        return false;
    } else {
        return true;
    }
}


function _verify_signature(input, key, method, type, signature) {
    if(type === "hmac") {
        return (signature === _sign(input, key, method));
    }
    else {
        throw new Error('Algorithm type not recognized');
    }
}


function _sign(input, key, method) {  
    return crypto.createHmac(method, key).update(input).digest('base64url');
}


function _base64urlDecode(str) {
    return exports.decodeString(str);//'exports' non supported by CFF. Only used to run unit tests. Removed before deployment.
}

function decodeString(str) {
    return String.bytesFrom(str, 'base64url');
}

  
function processJWTToken(myEvent){

    var headers = myEvent.request.headers; // nosonar

    var querystrings = myEvent.request.querystring; // nosonar
    var uri = myEvent.request.uri; // nosonar
    var viewer_ip = myEvent.viewer.ip; // nosonar


    var sessionId; // nosonar

    var pathArray = uri.split('/'); // nosonar

    //initial checks if token is present
    var auth_sequence = pathArray[1]; // nosonar
    if(!auth_sequence || pathArray.length < 3){
        throw new Error("Error: No token is present");
    }

    //inputs grooming and setting internal variables
    var auth_sequence_array = auth_sequence.split('.'); // nosonar
    if(auth_sequence_array.length == 4) sessionId=auth_sequence_array.shift();
    var jwtToken = auth_sequence_array.join('.'); // nosonar

    //sanity check of the JWT token length
    if (jwtToken.length < 60) {
        throw new Error("Error: Invalid JWT token in the path");
    }

    //removing token part of the URL path to restore original URL path pattern recognizable by the Origin
    pathArray.splice(1,1);
    var newUri = pathArray.join("/") // nosonar

    try{
        checkJWTToken(jwtToken, newUri, sessionId, headers, querystrings, viewer_ip);
        return newUri;
    }
    catch(e) {
        logToConsole(e);
        throw new Error("Error validating the token");
    }
}

function handler(event) {
    logToConsole(event);
    try{
        var request = event.request; // nosonar
        var newUri = processJWTToken(event); // nosonar
        //returning original playback URL to continue on the request path
        request.uri = newUri
        console.log("X_JWT_CHECK VALID");
        return request;
    }catch(error){
        logToConsole(error);
        console.log("X_JWT_CHECK INVALID");
        return response401;
    }

}

exports.handler = handler;//'exports' non supported by CFF. Only used to run unit tests. Removed before deployment.
exports.decodeString = decodeString;//'exports' non supported by CFF. Only used to run unit tests. Removed before deployment.

