client_jws_helpers = {};

client_jws_helpers.getClientCredentialJwt = function() {    
    console.log("in getClientCredentialsJwt");
    var jwtSecret = pm.environment.get('OB-SEAL-PRIVATE-KEY') || ''
    // Set headers for JWT
    var header = {
        'typ': 'JWT',
        'kid': pm.environment.get('OB-SIGNING-KEY-ID'),
        'alg': 'PS256'
    };
    console.info("kid is " + pm.environment.get('OB-SIGNING-KEY-ID'))
    var exp = (new Date().getTime() / 1000) + 60*5;
    
    var data = {
            "exp": exp,
            "iss": pm.environment.get("client_id"),
            "sub": pm.environment.get("client_id"),
            "aud": pm.environment.get("as_issuer_id"),
            "jti": pm.variables.replaceIn('{{$guid}}')
    }

    console.log("data in client credentials jwt: " + JSON.stringify(data))
    // sign token
    // console.log("call: " + JSON.stringify({jwtSecret: jwtSecret, data: data, header: header}) );
    //var signedToken = pmlib.jwtSign(jwtSecret, data, header, exp = 600, alg = "PS256")
    var signedToken =  KJUR.jws.JWS.sign(null, header, data, jwtSecret);
    return signedToken;
};

client_jws_helpers.createCompactSerializedJws = function() {
    var privateKey = pm.environment.get('OB-SEAL-PRIVATE-KEY');

    var currentTimestamp = Math.floor(Date.now() / 1000 - 1000)

    var header = {
        'typ': 'JOSE',
        'alg': 'PS256',
        "kid": pm.environment.get('OB-SIGNING-KEY-ID') || '',
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
    //console.log(`header: ${ JSON.stringify(header)}`);

    var jwt =  KJUR.jws.JWS.sign(null, header, data, privateKey);
    console.log("JWT:" + jwt);
    return jwt
};

client_jws_helpers.createDetatchedSignatureForm = function (compactSerializedJws){
    var jwtElements = jws.split(".");
    var detached_signature = jwtElements[0] + ".." + jwtElements[2];
    console.log("detached_signature:" + detached_signature);
    return detached_signature;
}

client_jws_helpers.createAuthorizeRequestUrl = function (scope, consentId) {
    console.log("in createAuthorizeRequestUrl(\"" + scope + "\", " + consentId + ")");
    var jwtSecret = pm.environment.get('OB-SEAL-PRIVATE-KEY') || ''
    console.log("jwtSecret is " + jwtSecret)
    var kid = pm.environment.get('OB-SIGNING-KEY-ID')
    console.log("kid is " + kid)
    // Set headers for JWT
    var audience = pm.environment.get('as_issuer_id')
    console.log("audience is " +audience)
    
    var exp = (new Date().getTime() / 1000) + 60*5;
    var header = {
        'typ': 'JWT',
        'kid': kid,
        'alg': 'PS256'
    };
    
    var data = {
          "aud": audience,
          "scope": scope,
          "iss": pm.environment.get("client_id"),
          "exp": exp,
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
    
    // sign token
    var signedToken =  KJUR.jws.JWS.sign(null, header, data, jwtSecret);
    
    var link = pm.environment.get("as_authorization_endpoint") + 
        "?client_id=" + pm.environment.get("client_id") + 
        "&response_type=code id_token&redirect_uri=" + pm.environment.get("client_redirect_uri") + 
        "&scope=openid payments&state=10d260bf-a7d9-444a-92d9-7b7a5f088208&nonce=10d260bf-a7d9-444a-92d9-7b7a5f088208&request=" + 
        signedToken;
    
    console.log("link is " + link)
    return link;
}