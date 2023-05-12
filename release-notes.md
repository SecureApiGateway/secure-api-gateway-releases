[//]: # (<details>)

[//]: # (<summary>Release Notes v1.0.1</summary>)

[//]: # (<!-- always an empty line before table -->)

## Secure API Gateway

The ForgeRock Secure API Gateway for Open Banking is an open-source solution that helps financial services organizations deliver both test and production Open Banking and custom APIs from one framework, enforced by the ForgeRock Identity Platform.

These are the release notes for `Secure API Gateway` version `v1.0.1` named `Aerosmith`

### Previous version
- `v1.0.0`

### Component Helm chart versions used by this release
| component                                                                                             | Helm chart version | Full changelog                                                                                                       |
|-------------------------------------------------------------------------------------------------------|--------------------|----------------------------------------------------------------------------------------------------------------------|
| IG [secure-api-gateway-ob-uk](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk)           | `1.0.1`            | [compare v1.0.0 vs v1.0.1](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk/compare/v1.0.0...v1.0.1)     |
| RS [secure-api-gateway-ob-uk-rs](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rs)     | `1.0.1`            | [compare v1.0.0 vs v1.0.1](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rs/compare/v1.0.0...v1.0.1)  |
| RCS [secure-api-gateway-ob-uk-rcs](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rcs)  | `1.0.1`            | [compare v1.0.0 vs v1.0.1](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rcs/compare/v1.0.0...v1.0.1) |
| RCS-UI [secure-api-gateway-ob-uk-ui](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-ui) | `1.0.2`            | [compare v1.0.1 vs v1.0.2](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-ui/compare/v1.0.1...v1.0.2)  | 

### Release Notes v1.0.1

### Upgrade Steps
[n/a]

### Breaking Changes
[n/a]

### New Features

| Addressed Issues                                                       | Description                                                                        | 
|------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| [945](https://github.com/secureapigateway/secureapigateway/issues/945) | IG Test Trusted Directory needs api to obtain Signing Pem/Key pair                 |
| [947](https://github.com/secureapigateway/secureapigateway/issues/947) | Display debtor account preselected when is provided and update the decision object |


[945: IG Test Trusted Directory needs api to obtain Signing Pem/Key pair](https://github.com/secureapigateway/secureapigateway/issues/945)

There was an API to obtain the pem and key file for the TLS certs, but not for the Signing certs.

Added new method to allow clients to obtain the tls key/pem pair from the jwks issued by IG and one for the sig key/pem pair too, so that the clients can easily obtain the key to use for signing, rather than relying on requests to IG to sign payloads using the supplied jwks.

Now the same set of tests could be used for either the IG Test Trusted Directory or the OB Test Directory issued certs.
This helps to have one Postman collection, with two different sections for creating the registration request.
One that uses OB Certs and one that uses IG issues certs, and the rest of the collection would work which ever type of certs you were using.

[947: Display debtor account preselected when is provided and update the decision object](https://github.com/secureapigateway/secureapigateway/issues/947)

In the payment initiation, the debtor account is optional as the PISP may not know the account
identification details for the PSU.

When the PISP knows the account identification, the debtor account is provided in the consent.

Now the Resource Consent Service user App, displays the consent details with a preselected
account that match with the debtor account provided in the consent, otherwise the app will display the
user accounts to be selected.

### Bug Fixes

| Addressed Issues                                                       | Description                                      | 
|------------------------------------------------------------------------|--------------------------------------------------|
| [485](https://github.com/secureapigateway/secureapigateway/issues/485) | FAPI compliance alignment from OB version v3.1.2 |
| [940](https://github.com/secureapigateway/secureapigateway/issues/940) | Payment submission does not work in v1.0.0       |

[485: FAPI compliance alignment from OB version v3.1.2](https://github.com/secureapigateway/secureapigateway/issues/485)

**Fixed**:The OB spec, since version v3.1.2 are aligned with FAPI Implementer's Draft 2.<br>
Changes for alignment with FAPI Implementer's Draft 2:
- Replaced references of `x-fapi-customer-last-logged-time` to `x-fapi-auth-date`
- Make references of `x-fapi-financial-id` non-mandatory

[940: Payment submission does not work in v1.0.0](https://github.com/secureapigateway/secureapigateway/issues/940)

All elements in the Initiation payload that are specified by the PISP must not be changed via the ASPSP as this is part of formal consent from the PSU.

The Initiation and Risk sections of the domestic-payment request must match the Initiation and Risk sections of the corresponding domestic-payment-consent request.

In the payment initiation, the debtor account is optional as the PISP may not know the account
identification details for the PSU.

When the PISP knows the account identification, the debtor account is provided in the consent.

In the version 1.0.0 the system updated the debtor account submitted in the consent with the account selected by the user,
when the user approved the consent, therefore and consequently the consent was modified.

**Fixed**: As the initiation payload consent should not be changed, but the system needs to know the accountId from the account
selected by the user, or the debtor account provided in the consent, to process properly the payment to simulate a bank payment process.
The system now store the accountId (could be the selected by the user or the debtor account provided in the consent)
in an external field without modify the payment consent that will remain exactly the same data provided in the initiation payload.

**Fixed**: Deserialization and Serialization problem with the date times when the system verify the payment submission against the payment consent.<br>
To compare date times between different objects using the date time must have the same chronology, instant and Time zone.<br>Now the system deserialize and serialize the date times to UTC YYYY-MM-DD'T'HH:mm:ssZ to store it and for equality checks

**Fixed**: Payment submission initiation section validation against payment initiation section consent.

### Performance Improvements
[n/a]

### Other Changes
[n/a]

[//]: # (</details>)