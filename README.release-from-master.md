# Create SAPIG Release from master

## Objective
Based on JIRA for SAPIG release 5.2.0: [OPENIG-10328 Prepare for release of SAPIG 5.2.0 built on IG 2026.3.0](https://pingidentity.atlassian.net/browse/OPENIG-10328)

Perform a release of the required SAPIG components from independent repos under the
[SecureApiGateway](https://github.com/SecureApiGateway) github org. This contrasts with performing a maintenance release
from the sustaining branch of a previous SAPIG release (which is a marginally different process).

Note that this requires deployment of the following SAPIG processes in order. Most follow the same general pattern,
but some differ slightly (mostly for historical reasons).

## FAPI/ OpenBanking developers
Devs for use in PR reviews, etc:
- wayne.morrison@pingidentity.com
- guillaumelamirand@pingidentity.com
- richard.hruza@pingidentity.com (QA)

## Release Order
The repos should be released in the following order (details per repo to follow):
* secure-api-gateway-parent
* secure-api-gateway-ob-uk-common
* secure-api-gateway-fapi-pep-as
* secure-api-gateway-fapi-pep-rs-core
* secure-api-gateway-fapi-pep-rs-ob:
* secure-api-gateway-test-trusted-directory
* secure-api-gateway-ob-uk-rcs - Remote Consent Server (RCS)
* secure-api-gateway-ob-uk-rs - Resource Server (RS)
* secure-api-gateway-ob-uk-ui - UI
    * This is sample application code, built on outdated technology. As it hasn’t been effectively released the intention is to leave it untouched
* secure-api-gateway-ob-uk-fidc-initializer - AIC config Initializer
* secure-api-gateway-ob-uk-test-data-initializer - Test data Initializer
* fr-platform-config - Platform Config
* secure-api-gateway-ob-uk-functional-tests - OB UK functional tests
* secure-api-gateway-functional-test-framework - Core functional tests
* secure-api-gateway-releases - Release

## Release Process
With the intention of avoiding ambiguity, precise versions numbers are used to represent terms in the explanation of
this release process, as follows:
- JIRA for release of SAPIG 5.2.0: https://pingidentity.atlassian.net/browse/OPENIG-10328
- Release version: `5.2.0`
- Current (pre-release) `master` branch:
    - SAPIG version: `5.2.0-SNAPSHOT`
    - IG version: `2026.3.0`
- Next (post-release) `sustaining/5.2.x` branch:
    - SAPIG version: `5.2.1-SNAPSHOT`
    - IG version: `2026.3.0` (unchanged)
- Next (post-release) `master` branch:
    - SAPIG version: `5.3.0-SNAPSHOT`
    - IG version: `2026.6.0`

Ordinarily, SAPIG minor versions increment with increments to the IG version. Subsequent patch releases to the IG
version will result in a patch version of SAPIG. Security or bugfixes may also result in a new patch release of SAPIG.
Major versions of SAPIG should only occur for significant functional changes (e.g. maybe FAPI 2).

The release process addresses the following repos in order...

### Repo: secure-api-gateway-parent
Note that the secure-api-gateway-parent repo is _special_ in that this repo is the parent repo and pom of others in this
org, providing a central location for declaration of dependencies and versions.

1. Prepare new sustaining branch for the release
    * checkout secure-api-gateway-parent master branch and ensure up-to-date:
   ```
     cd secure-api-gateway-parent
     git checkout master
     git pull
   ```
    * create new sustaining branch corresponding to the release (in this case, release 5.2.0):
   ```
     git checkout -b sustaining/5.2.x
   ```
2. Update to prepare for release of sustaining branch:
    * from the sustaining branch, update the root pom.xml to release the given version:
        * update `project.version` to the release version snapshot - `5.2.0-SNAPSHOT`
            * this is updated to the final release version as part of the release github action
        * update property `openig.version` to reflect the release IG version - `2026.3.0`
        * if required: update property `copyright-current-year` for the current year - 2026
        * if required: update the pom header comment end date for the current year - 2026
        * if required: update `scm.tag` to `HEAD`
    * commit: "OPENIG-10328 Prepare SAPIG 5.2.0 release (IG 2026.3.0)"
    * push to sustaining branch: `git push origin sustaining/5.2.x`
3. Launch release build with parameters for new release - 5.2.0, from above branch:
* run ["release" github action](https://github.com/SecureApiGateway/secure-api-gateway-parent/actions/workflows/release.yml) with parameters:
    * branch: `sustaining/5.2.x`
    * version `5.2.0`
    * release notes: `Release SAPIG 5.2.0 (IG 2026.3.0)`
* check:
    * presence of new tag: `v5.2.0` in [secure-api-gateway-parent repo tags](https://github.com/SecureApiGateway/secure-api-gateway-parent/tags)
    * that secure-api-gateway-parent tag 5.2.0 root pom.xml has `project.version` of `5.2.0` (not snapshot)
    * that secure-api-gateway-parent master branch root pom.xml has `project.version` updated for next development cycle - `5.3.0-SNAPSHOT`
4. Change sustaining branch to update for (potential) next dev cycle - version 5.2.1-SNAPSHOT:
* refresh sustaining branch `sustaining/5.2.x` for changes that incurred by branch release in step (3): `git pull`
* if required: update the root pom.xml `version` to the next snapshot: `5.2.1-SNAPSHOT`
* commit: "OPENIG-10328 Bump versions for dev after release of SAPIG 5.2.0"
* push to sustaining branch: `git push origin sustaining/5.2.x`
* await completion of PR build:
    * ["pr - build and deploy" github action](https://github.com/SecureApiGateway/secure-api-gateway-parent/actions/workflows/pr.yml)
5. Upload new sustaining artifacts:
* note that the PR build does not upload the new sustaining artifacts
* run ["merge - build and deploy" github action](https://github.com/SecureApiGateway/secure-api-gateway-parent/actions/workflows/merge.yml) with parameters:
    * branch: `sustaining/5.2.x`
* the deployed artifacts appear in:
    * [maven](https://maven.forgerock.org/ui/repos/tree/General/community/com/forgerock/sapi/gateway/secure-api-gateway-parent)
    * [helm](https://maven.forgerock.org/ui/repos/tree/General/forgerock-helm) but this needs fropenbanking user credentials
    * [docker](https://console.cloud.google.com/artifacts/docker/sbat-gcr-develop/europe-west4/sapig-docker-artifact)
6. Change master branch to update for next dev cycle - version 5.3.0-SNAPSHOT, based on IG 2026.6.0:
* on master branch, create new branch: `git checkout -b openig-10328-post-sapig-520-release`
* update the root pom.xml to update the IG version to the next snapshot:
    * if required: update property `openig.version` to next IG snapshot version - `2026.6.0-SNAPSHOT`
    * if required: update `project.version` to the release version snapshot - `5.3.0-SNAPSHOT`
* commit: "OPENIG-10328 Bump SAPIG versions for dev after release of SAPIG 5.2.0"
* push to master: `git push origin openig-10328-post-sapig-520-release`
    * raise PR for review and merge - reviewers are listed in section _FAPI/ OpenBanking developers_
    * on PR merge, the build will run automatically

### Repo: secure-api-gateway-ob-uk-common
1. Prepare new sustaining branch for the release:
    * Same instructions as secure-api-gateway-parent repo step (1) (above), but for repo secure-api-gateway-ob-uk-common
2. Update to prepare for release of sustaining branch:
    * Same instructions as secure-api-gateway-parent repo step (2), but for repo secure-api-gateway-ob-uk-common:
        * Note that there are differences to the pom.xml files, as in the delta below
    * Delta - pom files:
        * root-level pom.xml:
            * update `project.version` to the release version snapshot - `5.2.0-SNAPSHOT`
            * update `parent.version` to the release version snapshot - `5.2.0`
                * this corresponds with the secure-api-gateway-parent root pom.xml `project.version` (which is now released)
            * if required: update the pom header comment end date for the current year - 2026
            * if required: update `scm.tag` to `HEAD`
        * secure-api-gateway-ob-uk-common-bom/pom.xml
            * update `parent.version` to the release version snapshot - `5.2.0-SNAPSHOT`
                * this corresponds with this project's root pom.xml `project.version` (which is not yet released)
                * this is true for all other pom.xml files with parent `secure-api-gateway-ob-uk-common` pom.xml
            * if required: update the pom header comment end date for the current year - 2026
        * secure-api-gateway-ob-uk-common-datamodel/pom.xml
            * update `parent.version` to the release version snapshot - `5.2.0-SNAPSHOT`
            * if required: update the pom header comment end date for the current year - 2026
        * secure-api-gateway-ob-uk-common-error/pom.xml
            * update `parent.version` to the release version snapshot - `5.2.0-SNAPSHOT`
            * if required: update the pom header comment end date for the current year - 2026
        * secure-api-gateway-ob-uk-common-obie-datamodel/pom.xml
            * update `parent.version` to the release version snapshot - `5.2.0-SNAPSHOT`
            * if required: update the pom header comment end date for the current year - 2026
        * secure-api-gateway-ob-uk-common-shared/pom.xml
            * update `parent.version` to the release version snapshot - `5.2.0-SNAPSHOT`
            * if required: update the pom header comment end date for the current year - 2026
        * secure-api-gateway-ob-uk-common-shared/pom.xml
            * update `parent.version` to the release version snapshot - `5.2.0-SNAPSHOT`
            * if required: update the pom header comment end date for the current year - 2026
3. Launch release build with parameters for new release - 5.2.0, from above branch:
    * Same instructions as secure-api-gateway-parent repo step (3), but for repo secure-api-gateway-ob-uk-common:
        * use ["release" github action](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-common/actions/workflows/release.yml)
4. Change sustaining branch to update for (potential) next dev cycle - version 5.2.1-SNAPSHOT:
    * Same instructions as secure-api-gateway-parent repo step (4), but for repo secure-api-gateway-ob-uk-common
5. Upload new sustaining artifacts:
    * Same instructions as secure-api-gateway-parent repo step (5), but for repo secure-api-gateway-ob-uk-common:
        * use [merge - build and deploy" github action](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-common/actions/workflows/merge.yml)
6. Change master branch to update for next dev cycle - version 5.3.0-SNAPSHOT, based on IG 2026.6.0:
    * Same instructions as secure-api-gateway-parent repo step (6), but for repo secure-api-gateway-ob-uk-common
    * Delta - child pom.xml files:
        * if required: update root pom.xml `parent.version` to the release version snapshot - `5.3.0-SNAPSHOT`
        * if required: update root pom.xml `project.version` to the release version snapshot - `5.3.0-SNAPSHOT`
        * if required: update each child module pom.xml `parent.version` to the release version snapshot - `5.3.0-SNAPSHOT`

### Repo: secure-api-gateway-fapi-pep-as
1. Prepare new sustaining branch for the release:
    * Same instructions as secure-api-gateway-ob-uk-common repo step (1) (above), but for repo secure-api-gateway-fapi-pep-as
2. Update to prepare for release of sustaining branch:
    * Same instructions as secure-api-gateway-ob-uk-common repo step (2), but for repo secure-api-gateway-fapi-pep-as:
        * Note that there are differences to the pom.xml files and the Dockerfile, as in the delta below
          _* Delta:
        * root-level pom.xml:
            * update `project.version` to the release version snapshot - `5.2.0-SNAPSHOT`
                * update `parent.version` to the release version snapshot - `5.2.0`
                    * this corresponds with the secure-api-gateway-ob-uk-common root pom.xml `project.version` (which is now released)
            * if required: update the pom header comment end date for the current year - 2026
        * secure-api-gateway-fapi-pep-as-docker/pom.xml
            * update `parent.version` to the release version snapshot - `5.2.0-SNAPSHOT`
                * this corresponds with this project's root pom.xml `project.version` (which is not yet released)
            * if required: update the pom header comment end date for the current year - 2026
        * secure-api-gateway-fapi-pep-as-docker/Dockerfile
            * update Dockerfile `base_image` arg to correspond with IG release: `ARG base_image=gcr.io/forgerock-io/ig:2026.3.0`
                * the IG docker image can be found here: [IG docker repository](https://console.cloud.google.com/artifacts/docker/forgerock-io/us/gcr.io/ig)
            * if required: update the Dockerfile header comment end date for the current year - 2026
3. Launch release build with parameters for new release - 5.2.0, from above branch:
    * Same instructions as secure-api-gateway-ob-uk-common repo step (3), but for repo secure-api-gateway-fapi-pep-as:
        * use ["release" github action](https://github.com/SecureApiGateway/secure-api-gateway-fapi-pep-as/actions/workflows/release.yml)
4. Change sustaining branch to update for (potential) next dev cycle - version 5.2.1-SNAPSHOT:
    * Same instructions as secure-api-gateway-ob-uk-common repo step (4), but for repo secure-api-gateway-fapi-pep-as
5. Upload new sustaining artifacts:
    * Same instructions as secure-api-gateway-ob-uk-common repo step (5), but for repo secure-api-gateway-fapi-pep-as:
        * use [merge - build and deploy" github action](https://github.com/SecureApiGateway/secure-api-gateway-fapi-pep-as/actions/workflows/merge.yml)
6. Change master branch to update for next dev cycle - version 5.3.0-SNAPSHOT, based on IG 2026.6.0:
    * Same instructions as secure-api-gateway-ob-uk-common repo step (6), but for repo secure-api-gateway-fapi-pep-as:
        * Note that there are differences to the pom.xml files and the Dockerfile, as in the delta below
    * Delta
        * pom.xml files:
            * update root and child module pom.xml files with same instructions as secure-api-gateway-ob-uk-common repo step (6)
        * Dockerfile:
            * secure-api-gateway-fapi-pep-as-docker/Dockerfile
                * update Dockerfile `base_image` arg to correspond with the next IG release, postcommit tag: `ARG base_image=gcr.io/forgerock-io/ig/docker-build:2026.6.0-latest-postcommit`
                    * the IG docker image can be found here: [IG docker repository](https://console.cloud.google.com/artifacts/docker/forgerock-io/us/gcr.io/ig)
                * if required: update the Dockerfile header comment end date for the current year - 2026

Note on remaining repos:
* Most of the remaining repos to release follow this same pattern, but with artifacts and github actions in their own_
  repositories.
* For step (2), where appropriate, note that sub-module pom files may differ and should be treated according to their
  maven hierarchy (usually children of the root pom.xml). Pay attention to the root pom.xml parent, which will have
  been released but child pom.xml parent (the root pom.xml) will not yet have been released.
* For step (6), where appropriate, note that the root pom.xml and sub-module pom.xml files should be chained together
  for the next release snapshot. The root pom.xml should point to the snapshot secure-api-gateway-parent release
  snapshot version (if appropriate).
* In the following repo-based sections only stand-out deltas shall be highlighted.

### Repo: secure-api-gateway-fapi-pep-rs-core
Same instructions as secure-api-gateway-fapi-pep-as repo (above), but for repo secure-api-gateway-fapi-pep-rs-core.

### Repo: secure-api-gateway-fapi-pep-rs-ob
Same instructions as secure-api-gateway-fapi-pep-as repo (above), but for repo secure-api-gateway-fapi-pep-rs-ob.

### Repo: secure-api-gateway-test-trusted-directory
Same instructions as secure-api-gateway-fapi-pep-as repo (above), but for repo secure-api-gateway-test-trusted-directory.

Delta for step (2):
* Note that the root pom.xml has a dependency on secure-api-gateway-fapi-pep-as - set property `secure-api-gateway.fapi-pep-as.version` to version 5.2.0 (as released).

### Repo: secure-api-gateway-ob-uk-rcs
Same instructions as secure-api-gateway-fapi-pep-as repo (above), but for repo secure-api-gateway-ob-uk-rcs.

### Repo: secure-api-gateway-ob-uk-rs
Same instructions as secure-api-gateway-fapi-pep-as repo (above), but for repo secure-api-gateway-ob-uk-rs.

### Repo: secure-api-gateway-ob-uk-ui
This repo does not follow the pattern established so far. It will not be released:
* It is a sample UI, and based on out-of-date technology. It should be rewritten, but there is little value in doing so
  given its purpose.
* There is no value in releasing an artefact for this repo. It shall remain on its current release version 5.0.6.

### Repo: secure-api-gateway-ob-uk-fidc-initializer
This repo does not follow the pattern established so far. There is no release workflow for this repo:
* A release version tag should be created for the release version: `git tag v5.2.0 && git push`

### Repo: secure-api-gateway-ob-uk-test-data-initializer
Similar - but not the exact same - instructions as secure-api-gateway-fapi-pep-as repo (above), but for repo
secure-api-gateway-ob-uk-test-data-initializer. Some steps are omitted, see _Delta_ below.

Delta:
* Delta for step (2):
    * update `_infra/helm/securebanking-test-data-initializer/Chart.yaml` `version` and `appVersion` to release version - `5.2.0`
* Delta for step (3): ["release" github action](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-test-data-initializer/actions/workflows/release.yml)
* Delta for step (4): Step (4) is excluded
* Delta for step (5): ["merge" github action](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-test-data-initializer/actions/workflows/merge.yml)
* Delta for step (6): Step (6) is excluded

### Repo: fr-platform-config
This repo does not follow the pattern established so far. This repo is released only through execution of the release
workflow. Some steps are omitted, see _Delta_ below.

* Delta for step (2): Step (2) is excluded
* Delta for step (3): ["release" github action](https://github.com/SecureApiGateway/fr-platform-config/actions/workflows/release.yml)
* Delta for step (4): Step (4) is excluded
* Delta for step (5):  Step (5) is excluded
* Delta for step (6): Step (6) is excluded

### Repo: secure-api-gateway-ob-uk-functional-tests
Mostly the same instructions as secure-api-gateway-fapi-pep-as repo (above), but for repo
secure-api-gateway-ob-uk-functional-tests. See _Delta_ section to understand differences.

Delta:
* Note that this repo is gradle built, not maven, so there are no pom.xml files to update, only gradle build files.
* Delta for step (2):
    * update build.gradle.kts:
        * update `version` to release version `5.2.0`
        * update plugin implementation `com.forgerock.sapi.gateway:secure-api-gateway-ob-uk-common-bom` to release version `5.2.0`:
            * e.g. `implementation(platform("com.forgerock.sapi.gateway:secure-api-gateway-ob-uk-common-bom:5.2.0"))`
* Delta for step (6):
    * update build.gradle.kts:
        * update `version` to next release snapshot `5.3.0-SNAPSHOT`
        * update plugin implementation `com.forgerock.sapi.gateway:secure-api-gateway-ob-uk-common-bom` to next release snapshot `5.3.0-SNAPSHOT`:
            * e.g. `implementation(platform("com.forgerock.sapi.gateway:secure-api-gateway-ob-uk-common-bom:5.3.0-SNAPSHOT"))`

### Repo: secure-api-gateway-functional-test-framework
Mostly the same instructions as secure-api-gateway-fapi-pep-as repo (above), but for repo
secure-api-gateway-functional-test-framework. See _Delta_ section to understand differences.

Delta:
* Note that this repo is gradle built, not maven, so there are no pom.xml files to update, only gradle build files.
* Delta for step (2):
    * update build.gradle.kts:
        * update `version` to release version `5.2.0`
* Delta for step (6):
    * update build.gradle.kts:
        * update `version` to next release snapshot `5.3.0-SNAPSHOT`

### Repo: secure-api-gateway-releases
This repo does not follow the pattern established so far at all.

Instead, follow instructions as below:
* updates to apply to `sustaining/5.2.x` branch:
    * `core/secure-api-gateway-core/Chart.yaml`:
        * update `version` and `appVersion` to release version `5.2.0`
        * update dependencies versions to release version `5.2.0`
    * `ob/secure-api-gateway-ob/Chart.yaml`:
        * update `version` and `appVersion` to release version `5.2.0`
        * update dependencies versions to release version `5.2.0` - except name `remote-consent-service-user-interface`
            * this component is not released and should be left on current version (`5.0.6`)
    * `secure-api-gateway-helpers/Chart.yaml`:
        * update `version` and `appVersion` to release version `5.2.0`
        * update dependencies versions to release version `5.2.0`
    * `third-party/Chart.yaml`:
        * update `version` and `appVersion` to release version `5.2.0`
* Push to sustaining branch:
    * commit: "OPENIG-10328 Bump versions for SAPIG 5.2.0 release (IG 2026.3.0)"
    * push to sustaining branch: `git push origin sustaining/5.2.x`
* Do not update master branch version. This does not need to be updated for the snapshot version.
