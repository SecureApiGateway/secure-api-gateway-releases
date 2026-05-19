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

## Prerequisites

### GitHub access

The `ForgeCloud` org repos are accessible via the SecureApiGateway account (`RUNNER_SAPIG_ACCOUNT`). No account switching is needed for this skill.

Verify access before starting:

```bash
gh repo view ForgeCloud/secure-api-gateway-relenv-deployer 2>&1 | head -3
```

### Codefresh CLI

Steps 4–7 require the `codefresh` CLI and a personal API key.

**One-time setup:** generate a Codefresh API key at [https://g.codefresh.io/user/settings](https://g.codefresh.io/user/settings) (scopes needed: `pipeline:read`, `pipeline:write`, `pipeline:run`). Add to your shell profile:

```bash
export CF_API_KEY=<your-api-key>
```

**Guard — add this before steps 4–7:**

```bash
[ -z "${CF_API_KEY}" ] && echo "ERROR: CF_API_KEY is not set — export it before proceeding" && exit 1
```

## Steps Overview

| # | Description | Automatable |
|---|-------------|-------------|
| 1 | Release `secure-api-gateway-relenv-deployer` | Yes — `gh workflow run` |
| 2 | Update `secure-api-gateway-relenv-deployments` files and PR | Yes |
| 3 | Release `secure-api-gateway-relenv-deployments` | Yes — `gh workflow run` |
| 4 | Update Codefresh release env pipeline variables | Yes — `codefresh` CLI |
| 5 | Update Codefresh testing pipeline variables | Yes — `codefresh` CLI |
| 6 | Run release env deploy pipelines | Yes — `codefresh run` |
| 7 | Run release env test pipelines | Yes — `codefresh run` |

---

## Step 1 — Release secure-api-gateway-relenv-deployer

Trigger the GitHub Actions release workflow from `main`:

```bash
gh workflow run release.yml \
  --repo ForgeCloud/secure-api-gateway-relenv-deployer \
  --ref main \
  --field releaseVersion=${RELEASE_VERSION} \
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
  --field releaseVersion=${RELEASE_VERSION} \
  --field releaseNotes="Deploy SAPIG ${RELEASE_VERSION}"
```

Wait for the workflow to complete:

```bash
gh run list --repo ForgeCloud/secure-api-gateway-relenv-deployments --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId' | xargs -I{} gh run watch {} --repo ForgeCloud/secure-api-gateway-relenv-deployments --exit-status
```

Verify: tag `v${RELEASE_VERSION}` appears at `https://github.com/ForgeCloud/secure-api-gateway-relenv-deployments/tags`.

---

## Step 4 — Update Codefresh release env pipeline variables

Use the `codefresh` CLI (must be installed and authenticated). Define this helper in your shell session:

```bash
update_cf_pipeline() {
  local PIPELINE="$1"
  shift
  local TMP
  TMP=$(mktemp /tmp/cf-pipeline-XXXXXX.json)
  codefresh get pipeline --name "${PIPELINE}" --output json > "${TMP}"
  python3 - "${TMP}" "$@" << 'PYEOF'
import json, sys
path = sys.argv[1]
updates = dict(arg.split('=', 1) for arg in sys.argv[2:])
with open(path) as f:
    data = json.load(f)
p = data[0] if isinstance(data, list) else data
for v in p['spec']['variables']:
    if v['key'] in updates:
        old = v['value']
        v['value'] = updates[v['key']]
        print(f"  {v['key']}: {old} -> {v['value']}")
with open(path, 'w') as f:
    json.dump(p, f, indent=2)
PYEOF
  codefresh replace pipeline -f "${TMP}"
  rm -f "${TMP}"
  echo "Updated ${PIPELINE}"
}
```

### core-sandbox-v5

```bash
update_cf_pipeline "core-sandbox-v5-deploy-secure-api-gateway" \
  "REPO_RELENVS_DEPLOYER_TAG=${RELEASE_TAG}" \
  "REPO_RELENVS_DEPLOYMENTS_TAG=${RELEASE_TAG}"
```

### ob-sandbox-v5

> **Note:** Before running this pipeline, delete the `test-user-account-creator` job from the cluster first — this ensures it is recreated cleanly on the next deployment.
>
> Go to the GKE workload console, select the `ob-sandbox-v5` namespace, find `test-user-account-creator`, and delete it:
> https://console.cloud.google.com/kubernetes/workload/overview?project=sbat-dev&pageState=(%22savedViews%22:(%22n%22:%5B%22ob-sandbox-v5%22%5D))
>
> **Note:** GKE access requires being on the office network or an IP-whitelisted connection — VPN alone may not be sufficient. If not in the office, delete the job manually via the GCP console link above.

```bash
update_cf_pipeline "ob-sandbox-v5-deploy-secure-api-gateway" \
  "REPO_RELENVS_DEPLOYER_TAG=${RELEASE_TAG}" \
  "REPO_RELENVS_DEPLOYMENTS_TAG=${RELEASE_TAG}"
```

---

## Step 5 — Update Codefresh testing pipeline variables

Use the same `update_cf_pipeline` function (define it in the shell session if not already done).

> **Note:** `FUNCTIONAL_TESTS_IMAGE_TAG` uses the plain version (no `v` prefix); `REPO_RELENVS_DEPLOYMENTS_TAG` uses the `v`-prefixed tag.

### core-sandbox-v5 testing pipelines

```bash
update_cf_pipeline "core-sandbox-v5-conformance-dcr-tests" \
  "REPO_RELENVS_DEPLOYMENTS_TAG=${RELEASE_TAG}"

update_cf_pipeline "core-sandbox-v5-functional-tests" \
  "FUNCTIONAL_TESTS_IMAGE_TAG=${RELEASE_VERSION}" \
  "REPO_RELENVS_DEPLOYMENTS_TAG=${RELEASE_TAG}"
```

### ob-sandbox-v5 testing pipelines

```bash
update_cf_pipeline "ob-sandbox-v5-conformance-dcr-tests" \
  "REPO_RELENVS_DEPLOYMENTS_TAG=${RELEASE_TAG}"

update_cf_pipeline "ob-sandbox-v5-functional-tests" \
  "FUNCTIONAL_TESTS_IMAGE_TAG=${RELEASE_VERSION}" \
  "REPO_RELENVS_DEPLOYMENTS_TAG=${RELEASE_TAG}"
```

---

## Step 6 — Run release env deploy pipelines

> **Note:** `codefresh run` requires the fully qualified pipeline name (`ForgeCloud/secure-api-gateway-release/<name>`), not the short name.

Run both deploy pipelines and wait for them to complete:

```bash
CORE_BUILD=$(codefresh run "ForgeCloud/secure-api-gateway-release/core-sandbox-v5-deploy-secure-api-gateway" --detach 2>&1)
echo "core-sandbox-v5 build: ${CORE_BUILD}"

OB_BUILD=$(codefresh run "ForgeCloud/secure-api-gateway-release/ob-sandbox-v5-deploy-secure-api-gateway" --detach 2>&1)
echo "ob-sandbox-v5 build: ${OB_BUILD}"
```

Poll until both complete:

```bash
for BUILD_ID in ${CORE_BUILD} ${OB_BUILD}; do
  while true; do
    STATUS=$(codefresh get build "${BUILD_ID}" --output json 2>&1 | python3 -c "import json,sys; data=json.load(sys.stdin); p=data[0] if isinstance(data,list) else data; print(p['status'])")
    echo "$(date '+%H:%M:%S') ${BUILD_ID}: ${STATUS}"
    [[ "$STATUS" == "success" || "$STATUS" == "error" || "$STATUS" == "terminated" ]] && break
    sleep 30
  done
  echo "Final: ${BUILD_ID} = ${STATUS}"
done
```

Both must reach `success` before proceeding to step 7.

---

## Step 7 — Run release env test pipelines

Run all four test pipelines:

```bash
for PIPELINE in \
  "ForgeCloud/secure-api-gateway-release/core-sandbox-v5-conformance-dcr-tests" \
  "ForgeCloud/secure-api-gateway-release/core-sandbox-v5-functional-tests" \
  "ForgeCloud/secure-api-gateway-release/ob-sandbox-v5-conformance-dcr-tests" \
  "ForgeCloud/secure-api-gateway-release/ob-sandbox-v5-functional-tests"; do
  BUILD=$(codefresh run "${PIPELINE}" --detach 2>&1)
  echo "${PIPELINE##*/}: ${BUILD}"
done
```

Poll each build ID for completion and check results. A `success` status means all tests passed. An `error` status means tests failed — the pipeline sends a Slack notification and the test report is available in GCS:

```
gsutil -m cp -r gs://sapig-functional-test-reports/<env>/<YYYYMMDD>/<BUILD_ID> .
```

where `<env>` is `core-sandbox-v5` or `ob-sandbox-v5`.
