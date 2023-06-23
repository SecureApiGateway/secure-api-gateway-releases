## Deployment Guide [Internal]

The charts in this repo can create helm package to be pushed to the [forgerock helm artifactory](https://maven.forgerock.org). 
To publish a new version of the secure-api-gateway to the artifactory perform the following steps

- Go to [Github Actions](https://github.com/SecureApiGateway/secure-api-gateway-releases/actions/workflows/release.yaml)
- Click `Run Workflow`
  - Keep Branch as `master`
  - Add 'Release [VERSION]' as the description (optional)
  - Add [VERSION] to 'Provide release version number'
  - Click `Run Workflow`

Once the workflow has completed, a new tag and release will have been created within secure-api-gateway-release repo, and new helm packages will have been pushed to the atrifactory.

| Key | Description | Example |
|-----|-------------|---------|
| `VERSION` | Version of the charts to publish, must be unique and not already be in use | 1.0.0 |