# Secure API Gateway - Releases

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
  NOTE: GSM has been used but is not manditory, other secrets managers can be used.

## Installation Guide

### Assumptions
As mentioned above, as this point all infrastructure has been installed, a cloud instance has been created and configured, secrets have been created and deployed to kubernetes cluster and the softwares have been built with docker images deployed to a container registry. 

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