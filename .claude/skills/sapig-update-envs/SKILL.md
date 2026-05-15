---
name: sapig-update-envs
description: Post-release phase for SAPIG: update release environment pipelines and deployments after a SAPIG minor release. Run after sapig-release completes.
---

# SAPIG Update Release Environments

This skill is the **post-release phase** that runs after the main `sapig-release` skill completes. It updates the Codefresh-based release environment pipelines and deployments to point at the new SAPIG version.

## Usage

```
/sapig-update-envs <releaseVersion> <jiraId>
```

Example:
```
/sapig-update-envs 5.2.0 OPENIG-10328
```

From these arguments, derive:

| Variable | Example | Derivation |
|----------|---------|------------|
| `RELEASE_VERSION` | `5.2.0` | arg 1 |
| `RELEASE_TAG` | `v5.2.0` | arg 1 prefixed with `v` |
| `JIRA_ID` | `OPENIG-10328` | arg 2 |
| `JIRA_ID_LOWER` | `openig-10328` | arg 2 lower-cased |
| `BRANCH_NAME` | `openig-10328-create-sapig-520` | jira lower-case + `-create-sapig-` + version digits only |

## GitHub Account

The `ForgeCloud` org repos are accessible via the same SecureApiGateway account (`RUNNER_SAPIG_ACCOUNT`). No account switching is needed for this skill.

Verify access before starting:

```bash
gh repo view ForgeCloud/secure-api-gateway-relenv-deployer 2>&1 | head -3
```

## Steps Overview

| # | Description | Automatable |
|---|-------------|-------------|
| 1 | Release `secure-api-gateway-relenv-deployer` | Yes — `gh workflow run` |
| 2 | Update `secure-api-gateway-relenv-deployments` files and PR | Yes |
| 3 | Release `secure-api-gateway-relenv-deployments` | Yes — `gh workflow run` |
| 4 | Update Codefresh release env pipeline variables | Manual — Codefresh UI (cf CLI automation TBD) |
| 5 | Update Codefresh testing pipeline variables | Manual — Codefresh UI (cf CLI automation TBD) |

---

## Step 1 — Release secure-api-gateway-relenv-deployer

Trigger the GitHub Actions release workflow from `main`:

```bash
gh workflow run release.yml \
  --repo ForgeCloud/secure-api-gateway-relenv-deployer \
  --ref main \
  --field version=${RELEASE_VERSION} \
  --field releaseNotes="Deploy SAPIG ${RELEASE_VERSION}"
```

Wait for the workflow to complete before proceeding:

```bash
gh run list --repo ForgeCloud/secure-api-gateway-relenv-deployer --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId' | xargs -I{} gh run watch {} --repo ForgeCloud/secure-api-gateway-relenv-deployer --exit-status
```

Verify: tag `v${RELEASE_VERSION}` appears at `https://github.com/ForgeCloud/secure-api-gateway-relenv-deployer/tags`.

---

## Step 2 — Update secure-api-gateway-relenv-deployments

### 2a — Create branch

```bash
cd <FAPI_ROOT>/secure-api-gateway-relenv-deployments   # or clone if not present
git checkout main
git pull
git checkout -b ${BRANCH_NAME}
```

### 2b — Update files

**`core-sandbox-v5/.env`:**
- `SAPIG_VERSION` → `${RELEASE_VERSION}`
- `THIRDPARTY_VERSION` → `${RELEASE_VERSION}`
- `HELPERS_VERSION` → `${RELEASE_VERSION}`

**`core-sandbox-v5/.pipelineenv`:**
- `FUNCTIONAL_TESTS_IMAGE_TAG` → `${RELEASE_VERSION}`
- `REPO_RELENVS_DEPLOYER_TAG` → `${RELEASE_VERSION}`
- `REPO_RELENVS_DEPLOYMENTS_TAG` → `${RELEASE_VERSION}`

**`ob-sandbox-v5/.env`:**
- `SAPIG_VERSION` → `${RELEASE_VERSION}`
- `THIRDPARTY_VERSION` → `${RELEASE_VERSION}`
- `HELPERS_VERSION` → `${RELEASE_VERSION}`

**`ob-sandbox-v5/.pipelineenv`:**
- `FUNCTIONAL_TESTS_IMAGE_TAG` → `${RELEASE_VERSION}`
- `REPO_RELENVS_DEPLOYER_TAG` → `${RELEASE_VERSION}`
- `REPO_RELENVS_DEPLOYMENTS_TAG` → `${RELEASE_VERSION}`

### 2c — Commit, push and raise PR

```bash
git add -A
git commit -m "${JIRA_ID} Update release env deployments to SAPIG ${RELEASE_VERSION}"
git push origin ${BRANCH_NAME}
gh pr create \
  --repo ForgeCloud/secure-api-gateway-relenv-deployments \
  --base main \
  --head ${BRANCH_NAME} \
  --title "${JIRA_ID} Update release env deployments to SAPIG ${RELEASE_VERSION}" \
  --body "Updates core-sandbox-v5 and ob-sandbox-v5 to SAPIG ${RELEASE_VERSION}. Part of SAPIG ${RELEASE_VERSION} release (${JIRA_ID})." \
  --reviewer wmorrison365fr --reviewer guillaumelamirand --reviewer rh-fr
```

Wait for the PR to be reviewed, approved and merged before proceeding to step 3.

---

## Step 3 — Release secure-api-gateway-relenv-deployments

After the step 2 PR is merged, trigger the release workflow from `main`:

```bash
gh workflow run release.yml \
  --repo ForgeCloud/secure-api-gateway-relenv-deployments \
  --ref main \
  --field version=${RELEASE_VERSION} \
  --field releaseNotes="Deploy SAPIG ${RELEASE_VERSION}"
```

Wait for the workflow to complete:

```bash
gh run list --repo ForgeCloud/secure-api-gateway-relenv-deployments --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId' | xargs -I{} gh run watch {} --repo ForgeCloud/secure-api-gateway-relenv-deployments --exit-status
```

Verify: tag `v${RELEASE_VERSION}` appears at `https://github.com/ForgeCloud/secure-api-gateway-relenv-deployments/tags`.

---

## Step 4 — Update Codefresh release env pipeline variables

> **Manual step — Codefresh UI.** Navigate to each pipeline link below, go to **Variables**, and update the values shown.

### core-sandbox-v5

Pipeline: [core-sandbox-v5](https://g.codefresh.io/build/6936ba99a6b44af55d9f8ddd?activeAccountId=5bc76f3a8249cc15fa883acb)

| Variable | New value |
|----------|-----------|
| `REPO_RELENVS_DEPLOYER_TAG` | `${RELEASE_TAG}` |
| `REPO_RELENVS_DEPLOYMENTS_TAG` | `${RELEASE_TAG}` |

### ob-sandbox-v5

> **Note:** Before running this pipeline, manually delete `test-user-account-creator` first.

Pipeline: [ob-sandbox-v5](https://g.codefresh.io/build/6936bc9138f60fb50e1346e2?activeAccountId=5bc76f3a8249cc15fa883acb)

| Variable | New value |
|----------|-----------|
| `REPO_RELENVS_DEPLOYER_TAG` | `${RELEASE_TAG}` |
| `REPO_RELENVS_DEPLOYMENTS_TAG` | `${RELEASE_TAG}` |

---

## Step 5 — Update Codefresh testing pipeline variables

> **Manual step — Codefresh UI.** Navigate to each pipeline link below, go to **Variables**, and update the values shown.

### core-sandbox-v5 testing pipelines

**[core-sandbox-v5-conformance-dcr-tests](https://g.codefresh.io/pipelines/edit/workflow?activeAccountId=5bc76f3a8249cc15fa883acb&id=6811dbdf239deb5cbccd1993&pipeline=core-sandbox-v5-conformance-dcr-tests&projects=ForgeCloud%2Fsecure-api-gateway-release&projectId=63d3f10000817d1143958f87&rightbar=variables&context=github-bot)**

| Variable | New value |
|----------|-----------|
| `REPO_RELENVS_DEPLOYMENTS_TAG` | `${RELEASE_TAG}` |

**[core-sandbox-v5-functional-tests](https://g.codefresh.io/pipelines/edit/workflow?activeAccountId=5bc76f3a8249cc15fa883acb&id=6811dbdb7d7f6ca7f41e3c0a&pipeline=core-sandbox-v5-functional-tests&projects=ForgeCloud%2Fsecure-api-gateway-release&projectId=63d3f10000817d1143958f87&rightbar=variables&context=github-bot)**

| Variable | New value |
|----------|-----------|
| `FUNCTIONAL_TESTS_IMAGE_TAG` | `${RELEASE_TAG}` |
| `REPO_RELENVS_DEPLOYMENTS_TAG` | `${RELEASE_TAG}` |

### ob-sandbox-v5 testing pipelines

**[ob-sandbox-v5-conformance-dcr-tests](https://g.codefresh.io/pipelines/edit/workflow?activeAccountId=5bc76f3a8249cc15fa883acb&id=6811dc107d7f6ca7f41e3c0b&pipeline=ob-sandbox-v5-conformance-dcr-tests&projects=ForgeCloud%2Fsecure-api-gateway-release&projectId=63d3f10000817d1143958f87&rightbar=variables&context=github-bot)**

| Variable | New value |
|----------|-----------|
| `REPO_RELENVS_DEPLOYMENTS_TAG` | `${RELEASE_TAG}` |

**[ob-sandbox-v5-functional-tests](https://g.codefresh.io/pipelines/edit/workflow?activeAccountId=5bc76f3a8249cc15fa883acb&id=6811dc0c59a911d152ecef76&pipeline=ob-sandbox-v5-functional-tests&projects=ForgeCloud%2Fsecure-api-gateway-release&projectId=63d3f10000817d1143958f87&rightbar=variables&context=github-bot)**

| Variable | New value |
|----------|-----------|
| `FUNCTIONAL_TESTS_IMAGE_TAG` | `${RELEASE_TAG}` |
| `REPO_RELENVS_DEPLOYMENTS_TAG` | `${RELEASE_TAG}` |
