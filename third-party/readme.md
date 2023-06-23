# Secure API Gateway - Releases - Third Party

## Prerequisites

- Kubernetes v1.23 +
- Helm 3.0.0 +

To add the forgerock helm artifactory repository to your local machine to consume helm charts use the following;

```console
  helm repo add forgerock-helm https://maven.forgerock.org/artifactory/forgerock-helm-virtual/ --username [backstage_username]  --password [backstage_password]
  helm repo update
```

NOTE: You must have a valid [subscription](https://backstage.forgerock.com/knowledge/kb/article/a57648047#XAYQfS) to aquire the `backstage_username` and `backstage_password` values.

It is assumed that, the following components have been sucessfully built and docker images are within a docker container registry ready to be used. 

- [Secure API Gateway - Remote Consent Service](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rcs)
- [Secure API Gateway - Remote Consent Service User Interface](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-ui)
- [Secure API Gateway - Test Bank Facility](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rs)
- [Secure API Gateway - Test User Account Creator](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-test-data-initializer)

It is assumed that, either a deployments repo has been created containing the specific deployment overrides has been created, or if a repository are not being used they are at hand (within the instructions below it is assumed that a repo is being used)

It is assumed that all infrastructure has been created, including deploying the Cloud Instance, and that the following prerequisits have been deployed to the cluster
- [Nginx](https://kubernetes.github.io/ingress-nginx/deploy/)

## Helm Charts
### Deployment

This umbarella Chart is an helper for deploying any third party charts. Unlike Nginx, which is currenlty used for the whole cluster, and therefore could support multiple deployments of the Secure API Gateway, these charts are per deployment and may be deployment many times within the same cluster. At the time of writing it is only the MongoDB that is included in this chart.  

As this chart has been published to the forgerock-helm repository you can install this chart by running

```console
helm upgrade [DEPLOYMENTNAME] forgerock-helm/third-party --version [PACKAGE_VERSION] --namespace [NAMESPACE] -f ./[REPOFORDEPLOYMENT]/values.yaml --install --wait
```

| Key | Description | Example |
|-----|-------------|---------|
| `DEPLOYMENTNAME` | Helm name for the deployment, must be unique | secure-api-gateway-helpers-v1 |
| `PACKAGE_VERSION` | Version of the Charts to install | 1.0.0 |
| `NAMESPACE` | Namespace to deploy too | v1 |
| `REPOFORDEPLOYMENT` | Location of the deployment `values.yaml` file containing the deployment overrides | ../secure-api-gateway-overrides/v1 |

NOTE: The `DEPLOYMENTNAME` will be prefixed onto the Charts name, and therefore cannot exceed the recommended 67 characters in length. For example if the `DEPLOYMENTNAME` is secure-api-gateway-v1, the mongodb deployment name will be `secure-api-gateway-v1-mongodb`

## Support

For any issues or questions, please raise an issue within the [SecureApiGateway](https://github.com/SecureApiGateway/SecureApiGateway/issues) repository.