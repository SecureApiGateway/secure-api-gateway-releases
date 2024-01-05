client_jws_helpers = {};

client_jws_helpers.getClientCredentialJwt = function() {    
    console.log("getClientCredentialsJwt()");
    var exp = (new Date().getTime() / 1000) + 60*5;
    var data = {
            "exp": exp,
            "iss": pm.environment.get("client_id"),
            "sub": pm.environment.get("client_id"),
            "aud": pm.environment.get("as_issuer_id"),
            "jti": pm.variables.replaceIn('{{$guid}}')
    }

    console.log("data in client credentials jwt: " + JSON.stringify(data))
    return client_jws_helpers.createSignedJwt(data);
};

client_jws_helpers.createCompactSerializedJws = function() {
    var currentTimestamp = Math.floor(Date.now() / 1000 - 1000)
    var headers = {
        'typ': 'JOSE',
        'http://openbanking.org.uk/iat': currentTimestamp,
        'http://openbanking.org.uk/iss': pm.environment.get('OB-ORGANIZATION-ID') + '/' + pm.environment.get('OB-SOFTWARE-ID'),
        'http://openbanking.org.uk/tan': 'openbanking.org.uk',
        'crit': [
            'http://openbanking.org.uk/iat',
            'http://openbanking.org.uk/iss',
            'http://openbanking.org.uk/tan'
        ]
    };

    // resolve body value variables before calculate the signature, in that case to resolve {{user_debtor_account}}
    var Property = require('postman-collection').Property;
    var data = Property.replaceSubstitutions(pm.request.body.raw, pm.variables.toObject())
    if(data==null){
        throw new Error("data must not be null")
    }
    console.log("data: " + data)
    return client_jws_helpers.createSignedJwt(data, headers)
};

client_jws_helpers.createDetatchedSignatureForm = function (compactSerializedJws){
    var jwtElements = jws.split(".");
    var detached_signature = jwtElements[0] + ".." + jwtElements[2];
    console.log("detached_signature:" + detached_signature);
    return detached_signature;
}

client_jws_helpers.createAuthorizeRequestUrl = function (scope, consentId) {
    return client_jws_helpers.createAuthorizeRequestUrlInternal(scope, consentId, false)
}

client_jws_helpers.createAuthorizeRequestUrlWithJarm = function (scope, consentId) {
    return client_jws_helpers.createAuthorizeRequestUrlInternal(scope, consentId, true)
}

client_jws_helpers.createAuthorizeRequestUrlInternal = function (scope, consentId, jarm) {
    console.log("in createAuthorizeRequestUrl(\"" + scope + "\", " + consentId + ", " + jarm + ")");

    var signedToken = client_jws_helpers.createAuthorizeJwt(scope, consentId, jarm);
    console.log("signedToken is " + signedToken)
    
    if (jarm) {
        var responseType = "code"
        var responseMode = "jwt"
    } else {
        var responseType = "code id_token"
    }

    var link = pm.environment.get("as_authorization_endpoint") + 
        "?client_id=" + pm.environment.get("client_id") + 
        "&response_type=" + responseType + "&redirect_uri=" + pm.environment.get("client_redirect_uri") + 
        "&scope=" + scope + "&state=10d260bf-a7d9-444a-92d9-7b7a5f088208&nonce=10d260bf-a7d9-444a-92d9-7b7a5f088208&request=" + 
        signedToken;

    if (responseMode) {
        link = link + "&response_mode=" + responseMode
    }
    
    console.log("link is " + link)
    return link;
}

client_jws_helpers.createAuthorizeRequestUrlForPar = function(scope, jarm) {

    if (jarm) {
        var responseType = "code"
        var responseMode = "jwt"
    } else {
        var responseType = "code id_token"
    }

    var link = pm.environment.get("as_authorization_endpoint") + 
        "?client_id=" + pm.environment.get("client_id") + 
        "&response_type=" + responseType +
        "&redirect_uri=" + pm.environment.get("client_redirect_uri") + 
        "&scope=" + scope + "&state=10d260bf-a7d9-444a-92d9-7b7a5f088208&nonce=10d260bf-a7d9-444a-92d9-7b7a5f088208" + 
        "&request_uri=" + pm.environment.get("par_request_uri")

    if (responseMode) {
        link = link + "&response_mode=" + responseMode
    }

    console.log("link is " + link)
    return link
}

client_jws_helpers.createAuthorizeJwt = function(scope, consentId, jarm){
    console.log("in createAuthorizeJwt(\"" + scope + "\", " + consentId + ")");
    return client_jws_helpers.createSignedJwt(client_jws_helpers.createAuthorizeJwtData(scope, consentId, jarm))
}

client_jws_helpers.createAuthorizeJwtWithPkce = function(scope, consentId, jarm){
    console.log("in createAuthorizeJwtWithPkce(\"" + scope + "\", " + consentId + ")");
    client_jws_helpers.createPkceChallengeData()
    var data = client_jws_helpers.createAuthorizeJwtData(scope, consentId, jarm)
    data.code_challenge = pm.environment.get("pkce_challenge")
    data.code_challenge_method = pm.environment.get("pkce_challenge_method")
    return client_jws_helpers.createSignedJwt(data)
}

client_jws_helpers.createAuthorizeJwtData = function(scope, consentId, jarm) {
    var audience = pm.environment.get('as_issuer_id')
    console.log("audience is " +audience)
   
    var nbf = (new Date().getTime() / 1000);
    var exp = nbf + 60*5;

    var data = {
          "aud": audience,
          "scope": scope,
          "iss": pm.environment.get("client_id"),
          "exp": exp,
          "nbf": nbf,
          "claims": {
            "id_token": {
              "acr": {
              "value": "urn:openbanking:psd2:ca",
              "essential": true
            },
            "openbanking_intent_id": {
              "value": consentId,
              "essential": true
            }
          }
        },
        "response_type": "code id_token",
        "redirect_uri": pm.environment.get("client_redirect_uri"),
        "state": "10d260bf-a7d9-444a-92d9-7b7a5f088208",
        "nonce": "10d260bf-a7d9-444a-92d9-7b7a5f088208",
        "client_id": pm.environment.get("client_id")
    }

    if (jarm) {
        data.response_type = "code"
        data.response_mode = "jwt"
    }

    return data
}

client_jws_helpers.createSignedJwt = function(data, additional_headers = {}) {
    var kid = pm.environment.get('OB-SIGNING-KEY-ID')
    console.log("kid is " + kid)
    var headers = {
        'typ': 'JWT',
        'kid': kid,
        'alg': 'PS256'
    };
    headers = {
        ...headers,
        ...additional_headers
    }
    console.log("JWT headers: " + headers)
    var jwtSecret = pm.environment.get('OB-SEAL-PRIVATE-KEY') || ''
    return KJUR.jws.JWS.sign(null, headers, data, jwtSecret);
}

client_jws_helpers.setClientCredentialRequestHeaders = function (token_endpoint_auth_method){
    if(token_endpoint_auth_method === "tls_client_auth"){
        var client_id = pm.environment.get("client_id")
        console.log("Obtaining OAuth2 token with a client_credential grant type, using tls_client_auth as the Token Endpoint Auth Method. setting 'client_id' header to " + client_id)
        pm.request.body.urlencoded.add({key: "client_id", value: client_id});
    } else if (token_endpoint_auth_method === "private_key_jwt"){
        console.log("Obtaining OAuth2 token with a client_credential grant type, using the private_key_jwt as the Token Endpoint Auth Method.")
        console.log("Setting 'client_assertion_type' header to 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'.")
        pm.request.body.urlencoded.add({ key: "client_assertion_type", value: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"});
        var signedToken = client_jws_helpers.getClientCredentialJwt();
        console.log("Setting 'client_assertion' header to: " + signedToken);
        pm.request.body.urlencoded.add({ key: "client_assertion", value: signedToken});
    } else {
        var errorString = "Unrecognised token_endpoint_auth_method. Please set an environment variable called TOKEN_ENDPOINT_AUTH_METHOD giving it the value of either tls_client_auth, or private_key_jwt";
        console.error(errorString);
        throw Error("Unrecognised token_endpoint_auth_method. Please set an environment variable called TOKEN_ENDPOINT_AUTH_METHOD giving it the value of either tls_client_auth, or private_key_jwt");
    }
}

client_jws_helpers.setPkceVerifierInRequestBody = function() {
    console.log("Adding PKCE code_verifier to request body")
    pm.request.body.urlencoded.add({key: "code_verifier", value: pm.environment.get("pkce_verifier")})
}

client_jws_helpers.getPaymentConsentId = function (){
    var consentType = pm.environment.get("consent_type");
    if ( typeof consentType === 'undefined'){
        throw Error("Environment variable consent_type is not set. Please set it in the 'test' scripts after the consent has been created");
    }
    var consentIdEnvironmentVariableName = consentType + "_payment_consent_id";
    console.log("Getting ConsentId from environment variable '" + consentIdEnvironmentVariableName + "'");
    var consent_id = pm.environment.get(consentIdEnvironmentVariableName);
    console.log("Consent Id is " + consent_id)
    return consent_id;
}

/*
* Function that generates PKCE challenge data.
*
* Sets the following postman environment variables:
* - pkce_verifier - base64URLEncoded randomly generated string
* - pkce_challenge - base64URLEncoded SHA256 hash of the pkce_verifier
* - pkce_challenge_method - S256
*/
client_jws_helpers.createPkceChallengeData = function(){
    console.log("Generating PKCE data and setting environment variables")
    function base64URLEncode(words) {
        return CryptoJS.enc.Base64.stringify(words)
                                  .replace(/\+/g, '-')
                                  .replace(/\//g, '_')
                                  .replace(/=/g, '');
    }
    var verifier = base64URLEncode(CryptoJS.lib.WordArray.random(50));
    var challenge = base64URLEncode(CryptoJS.SHA256(verifier));
    postman.setEnvironmentVariable("pkce_verifier", verifier)
    postman.setEnvironmentVariable("pkce_challenge", challenge)
    postman.setEnvironmentVariable("pkce_challenge_method", "S256")
}
