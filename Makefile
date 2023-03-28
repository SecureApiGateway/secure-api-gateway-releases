helm_repo := forgerock-helm/secure-api-gateway-helpers

package_helm:
ifndef version
	$(error A version must be supplied, Eg. make package_helm version=1.0.0)
endif
ifndef name
	$(error A name must be supplied, Eg. make package_helm name=external-secrets-gsm)
endif
	helm dependency update ${name}
	helm package ${name} --version ${version} --app-version ${version}

publish_helm:
ifndef version
	$(error A name must be supplied, Eg. make package_helm version=1.0.0)
endif
ifndef name
	$(error A helm repo must be supplied, Eg. make package_helm helm_repo=forgerock-helm/secure-api-gateway)
endif
	jf rt upload  ./${name} ${helm_repo}