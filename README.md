# Secure API Gateway - Releases

## Introduction 

This repository is a part of the secure-api-gateway - for more information visit the [wiki](https://github.com/SecureAPIGateway/SecureApiGateway/wiki)

## Repo Overview

The purpose of this repository is to provide customers with installable versions of the secure-api-gateway.
Customers will be able to take the releases of this repo for version 1,2,N and deploy to a kubernetes infrastructure.
The secure-api-gateway involves a number of components which are installed via [helm](https://helm.sh/) and [kustomize](https://kustomize.io/) and overlays which will all be documented here.

The issue that this repository is trying to tackle is that the components are all in individual repositories, within the repositories are the infrastructure objects files. Customers previously would have to deploy from the individual repositories, ensuring that the values.yaml files are modified for their deployment. This would be difficult if mutliple versions of the secure-api-gateway are being managed as the values.yaml file would need modifying each time. 

With this repository we are providing a set of versions of the secure api gateway, meaning that a customer can deploy numerous verisons of V1.0.0, V1.0.1, V2.0.0 ect. A benefit of this is that the custoemer no longer needs to figure out which components are compatible with each other. 
How this is achieved is by deploying the umbarella charts which are uploaded to the [forgerock helm artifactory](https://maven.forgerock.org). Within the umbrella charts are the versioned components that make up the secure-api-gateway, for example V1.0.1 of the secure-api-gateway may contain;
- [V1.0.0 Remote Consent Service](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rcs)
- [V1.0.1 Remote Consent Service User Interface](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-ui)
- [V1.0.1 Test Bank Facility](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rs)
- [V1.0.0 Test User Account Creator](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-test-data-initializer)

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
- [MongoDB](https://github.com/SecureApiGateway/secure-api-gateway-releases/blob/master/third-party/Chart.yaml)
- [Secrets](https://github.com/SecureApiGateway/secure-api-gateway-releases-helpers/tree/master/external-secrets-gsm) 
  
NOTE: For Secrets, Google Secrets Manager has been used but is not manditory, other secrets managers can be used.

## Installation Guide

### Assumptions
At this point all [infrastructure](https://github.com/SecureApiGateway/SecureApiGateway/wiki/Recommended-Infrastructure) has been installed, a cloud instance has been created and configured, secrets have been created and deployed to kubernetes cluster and the softwares have been built with docker images deployed to a container registry. 

These steps can be performed manually or via a pipeline (within the instructions below it is assumed that these are being performed manually)

It is assumed that the structure of the deployment repo looks like the following 

```console
secure-api-gateway-deployments
  v1
    id-cloud-config
      [cloud-instance-objects]
    kustomize/overlay/7.2.0
      ca.crt
      configmap.yaml
      kustomization.yaml
      secret.yaml
    values.yaml
  v2
    id-cloud-config
      [cloud-instance-objects]
    kustomize/overlay/7.2.0
      ca.crt
      configmap.yaml
      kustomization.yaml
      secret.yaml
    values.yaml
```
### Steps
- Ensure you are connected to your kubernetes cluster
- Ensure deployment repo is cloned to local machine and cd into
- cd into kustomize/overlay/7.2.0 folder where the `kustomization.yaml` is
- Enter the following commands;
  ```console
  kustomize build > deployment.yaml
  kubectl apply -f deployment.yaml -n [DEPLOYMENTNAME]
  rm deployment.yaml
  ```
- cd to the root of the deployment repo
- Enter the following commands;
  ```console
  helm upgrade [DEPLOYMENTNAME] forgerock-helm/secure-api-gateway --version [PACKAGE_VERSION] --namespace [NAMESPACE] -f values.yaml --install --wait
  ```

| Key | Description | Example |
|-----|-------------|---------|
| `DEPLOYMENTNAME` | Helm name for the deployment, must be unique | secure-api-gateway-v1 |
| `PACKAGE_VERSION` | Version of the Charts to install | 1.0.0 |
| `NAMESPACE` | Namespace to deploy too | v1 |

## Support

For any issues or questions, please raise an issue within the [SecureApiGateway](https://github.com/SecureApiGateway/SecureApiGateway/issues) repository.

## Contribute

For contributing to the secure-api-gateway project please refer to the wiki [guide](https://github.com/SecureApiGateway/SecureApiGateway/wiki/Contribute).