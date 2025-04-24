# Secure API Gateway - Releases - Secure API Gateway

## Prerequisites

- Kubernetes v1.23 +
- Helm 3.0.0 +

To add the forgerock helm artifactory repository to your local machine to consume helm charts use the following;

```console
  helm repo add forgerock-helm https://maven.forgerock.org/artifactory/forgerock-helm-virtual/ --username [backstage_username]  --password [backstage_password]
  helm repo update
```

NOTE: You must have a valid [subscription](https://backstage.forgerock.com/knowledge/kb/article/a57648047#XAYQfS) to acquire the `backstage_username` and `backstage_password` values.

It is assumed that, the following components have been successfully built and docker images are within a docker container registry ready to be used.

It is assumed that, either a deployments repo has been created containing the specific deployment overrides has been created, or if a repository are not being used they are at hand (within the instructions below it is assumed that a repo is being used)

It is assumed that all infrastructure has been created, including deploying the Cloud Instance, and that the following prerequisites have been deployed to the cluster
- [Nginx](https://kubernetes.github.io/ingress-nginx/deploy/)
- [MongoDB](https://github.com/SecureApiGateway/secure-api-gateway-releases/blob/master/third-party/Chart.yaml)
- [Secrets](https://github.com/SecureApiGateway/secure-api-gateway-releases-helpers/tree/master/external-secrets-gsm) 
  NOTE: GSM has been used but is not mandatory, other secrets managers can be used.

## Helm Charts
### Deployment

This umbrella Chart will install the core components that make up the Secure-API-Gateway. There is no `values.yaml` file within this repo, any values will come from the individual charts themselves, and there is a `values.yaml` within the deployment repo. 

As this chart has been published to the forgerock-helm repository you can install this chart by running

```console
helm upgrade [DEPLOYMENTNAME] forgerock-helm/secure-api-gateway --version [PACKAGE_VERSION] --namespace [NAMESPACE] -f ./[REPOFORDEPLOYMENT]/values.yaml --install --wait
```

| Key | Description | Example |
|-----|-------------|---------|
| `DEPLOYMENTNAME` | Helm name for the deployment, must be unique | secure-api-gateway-v1 |
| `PACKAGE_VERSION` | Version of the Charts to install | 1.0.0 |
| `NAMESPACE` | Namespace to deploy too | v1 |
| `REPOFORDEPLOYMENT` | Location of the deployment `values.yaml` file containing the deployment overrides | ../secure-api-gateway-overrides/v1 |

## Support

For any issues or questions, please raise an issue within the [SecureApiGateway](https://github.com/SecureApiGateway/SecureApiGateway/issues) repository.