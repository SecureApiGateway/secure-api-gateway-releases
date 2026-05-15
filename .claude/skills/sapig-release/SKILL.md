---
name: sapig-release
description: Orchestrate a SAPIG minor release across all SecureApiGateway org repos in the correct order. Takes release version, JIRA ID, IG release version, and next IG snapshot version as arguments.
---

# SAPIG Release from Master

Perform a minor release of SAPIG components across the SecureApiGateway GitHub org.

## Usage

```
/sapig-release <releaseVersion> <jiraId> <igReleaseVersion> <nextIgSnapshotVersion> [fapiRoot] [openIgRoot]
```

Example:
```
/sapig-release 5.2.0 OPENIG-10328 2026.3.0 2026.6.0
```

The last two arguments are optional and default to `~/dev/fapi` and `~/dev/openig` if not provided.

This skill can be invoked from any working directory — all repo paths are resolved via `FAPI_ROOT` and `OPENIG_ROOT`.

## Installation

The canonical copy of this skill lives in `secure-api-gateway-releases`:

```
.claude/skills/sapig-release/SKILL.md
```

Each developer installs it by symlinking into their Claude skills directory:

```bash
ln -s ~/dev/fapi/secure-api-gateway-releases/.claude/skills/sapig-release ~/.claude/skills/sapig-release
```

Adjust `~/dev/fapi` if you cloned `secure-api-gateway-releases` elsewhere — or pass the correct path as `[fapiRoot]` when invoking the skill.

**Prerequisites before running:**
- Both GitHub accounts authenticated in `gh` (SecureApiGateway org account and ping-rocks account) — see the GitHub Accounts section below
- `secure-api-gateway-releases` cloned (provides the skill itself)
- All other repos either cloned under `FAPI_ROOT`/`OPENIG_ROOT` or will be auto-cloned by the Setup step

From these arguments, derive the following variables and use them throughout:

| Variable | Example | Derivation |
|----------|---------|------------|
| `RELEASE_VERSION` | `5.2.0` | arg 1 |
| `JIRA_ID` | `OPENIG-10328` | arg 2 |
| `IG_RELEASE_VERSION` | `2026.3.0` | arg 3 |
| `NEXT_IG_SNAPSHOT` | `2026.6.0-SNAPSHOT` | arg 4 + `-SNAPSHOT` |
| `FAPI_ROOT` | `~/dev/fapi` | arg 5, or `~/dev/fapi` if omitted |
| `OPENIG_ROOT` | `~/dev/openig` | arg 6, or `~/dev/openig` if omitted |
| `RELEASE_SNAPSHOT` | `5.2.0-SNAPSHOT` | arg 1 + `-SNAPSHOT` |
| `SUSTAINING_BRANCH` | `sustaining/5.2.x` | arg 1, replace patch digit with `x` |
| `IG_SUSTAINING_BRANCH` | `sustaining/2026.3.x` | arg 3, replace patch digit with `x` |
| `JIRA_ID_LOWER` | `openig-10328` | arg 2 lower-cased |
| `POST_RELEASE_BRANCH` | `openig-10328-post-sapig-520-release` | jira lower-case + `-post-sapig-` + version digits only + `-release` |
| `NEXT_SAPIG_SNAPSHOT` | `5.3.0-SNAPSHOT` | increment minor of arg 1, reset patch to 0, + `-SNAPSHOT` |
| `SUSTAINING_SNAPSHOT` | `5.2.1-SNAPSHOT` | increment patch of arg 1 by 1, + `-SNAPSHOT` |
| `CURRENT_YEAR` | `2026` | from system date |
| `RUNNER_SAPIG_ACCOUNT` | `wmorrison365fr` | discovered from `gh auth status` — see GitHub Accounts section |
| `RUNNER_PING_ROCKS_ACCOUNT` | `wayne-morrison_pingcorp` | discovered from `gh auth status` — see GitHub Accounts section |

**This is a minor (master) release.** For sustaining/patch releases, a separate skill handles that.

## Execution Strategy

Steps have dependencies that prevent full parallelism. The dependency graph is:

```
parent → ob-uk-common → fapi-pep-as ─────────────────────┐
                      → fapi-pep-rs-core                  ↓
                      → fapi-pep-rs-ob           test-trusted-directory
                      → rcs → rs
                      → functional-tests
```

Use this to maximise parallelism per step:

| Step | Parallelism |
|------|-------------|
| **Step 1** | All repos in parallel — branch creation has no inter-repo dependencies |
| **Step 2** | parent first; then ob-uk-common; then fapi-pep-as, rs-core, rs-ob, rcs in parallel; then test-trusted-directory and rs in parallel; then functional-tests |
| **Step 3 (pr.yml + release.yml)** | Same order as Step 2 — each repo's release must complete before downstream repos can reference the published artifact |
| **Step 4** | Batch all repos in parallel once step 3 is done |
| **Step 5** | Batch all repos in parallel once step 4 builds are green |
| **Step 6** | Raise all master bump PRs at once; merge in dependency order (see step 6 notes below) — do NOT merge all at once |

> **Important:** all step 6 PRs must be merged before the next nightly build runs. Master will be broken until every repo's post-release version bump is merged. Do not leave step 6 partially complete overnight.

## Default Branch Names

Most repos use `master`. The following use `main` instead:
- `secure-api-gateway-fapi-pep-as`
- `secure-api-gateway-fapi-pep-rs-core`
- `secure-api-gateway-fapi-pep-rs-ob`
- `secure-api-gateway-test-trusted-directory`

Substitute `main` for `master` in all steps for those repos.

## GitHub Accounts

The skill uses two separate GitHub accounts — one for the `SecureApiGateway` org and one for `ping-rocks`. Both must be authenticated in `gh` before running.

### Team members

| Person | SecureApiGateway account | ping-rocks account |
|--------|--------------------------|-------------------|
| Wayne Morrison | `wmorrison365fr` | `wayne-morrison_pingcorp` |
| Guillaume Lamirand | `guillaumelamirand` | `guillaumelamirand_pingcorp` |
| Richard Hruza (QA) | `rh-fr` | `richard-hruza_pingcorp` |

### Account discovery

At the start of a session, identify which team member is running the skill by checking which accounts are authenticated:

```bash
gh auth status 2>&1 | grep "Logged in" | grep -oP '(?<=account )\S+'
```

Match the output against the table above to determine:
- `RUNNER_SAPIG_ACCOUNT` — the runner's SecureApiGateway account (e.g. `wmorrison365fr`)
- `RUNNER_PING_ROCKS_ACCOUNT` — the runner's ping-rocks account (e.g. `wayne-morrison_pingcorp`)

If neither account in any row is authenticated, stop and ask the runner to authenticate before proceeding.

### Reviewer lists

For **SecureApiGateway repos** — all team members using their SecureApiGateway accounts:
`--reviewer wmorrison365fr --reviewer guillaumelamirand --reviewer rh-fr`

For **ping-rocks/openig PRs** — all team members using their ping-rocks accounts:
`--reviewer wayne-morrison_pingcorp --reviewer guillaumelamirand_pingcorp --reviewer richard-hruza_pingcorp`

These lists are fixed — always include all three regardless of who is running the skill.

### Account switching

- Use `RUNNER_SAPIG_ACCOUNT` (active by default) for all `SecureApiGateway` org operations.
- Switch to `RUNNER_PING_ROCKS_ACCOUNT` only for `ping-rocks/openig` operations, then switch back:
  ```bash
  gh auth switch --user ${RUNNER_PING_ROCKS_ACCOUNT}
  # ... ping-rocks gh commands ...
  gh auth switch --user ${RUNNER_SAPIG_ACCOUNT}
  ```

---

## Setup — Locate or Clone Repos

Before starting, resolve the local path for each repo. For each repo in the release order:

1. Search for it under `FAPI_ROOT` (or `OPENIG_ROOT` for `openig-fapi-tests`):
   ```bash
   find FAPI_ROOT -maxdepth 3 -name ".git" -type d | xargs -I{} dirname {} | xargs -I{} basename {} | grep <REPO>
   ```
   Or more directly:
   ```bash
   find FAPI_ROOT -maxdepth 3 -type d -name "<REPO>"
   ```

2. If found, note the full path. If not found, clone it:
   ```bash
   cd FAPI_ROOT
   git clone git@github.com:SecureApiGateway/<REPO>.git
   ```
   For `openig-fapi-tests`, no clone is needed — the module lives inside the openig repo at `OPENIG_ROOT`.

3. Use the resolved path wherever `<FAPI_ROOT>/<REPO>` or `<OPENIG_ROOT>` appears in the steps below.

> **secure-api-gateway-releases** may be located in a subdirectory (e.g. `FAPI_ROOT/cicd/secure-api-gateway-releases`). The `find` command above will locate it regardless of nesting.

---

## Release Order

Process repos in this exact order:

1. `secure-api-gateway-parent`
2. `secure-api-gateway-ob-uk-common`
3. `secure-api-gateway-fapi-pep-as`
4. `secure-api-gateway-fapi-pep-rs-core`
5. `secure-api-gateway-fapi-pep-rs-ob`
6. `secure-api-gateway-test-trusted-directory`
7. `secure-api-gateway-ob-uk-rcs`
8. `secure-api-gateway-ob-uk-rs`
9. `secure-api-gateway-ob-uk-ui` — **SKIP** (sample app, stays on `5.0.6`)
10. `secure-api-gateway-ob-uk-fidc-initializer` — **TAG ONLY** (no release workflow)
11. `secure-api-gateway-ob-uk-test-data-initializer`
12. `fr-platform-config` — **BRANCH + RELEASE WORKFLOW ONLY**
13. `secure-api-gateway-ob-uk-functional-tests`
14. `openig-fapi-tests` — **NEW PROCESS** (in ping-rocks/openig, treat with care)
15. `secure-api-gateway-releases` — **HELM ONLY, NO SUSTAINING BRANCH**

---

## Standard 6-Step Process

Most repos follow this pattern. Per-repo sections below call out all variations.

### Step 1 — Create sustaining branch

```bash
cd <FAPI_ROOT>/<REPO>
git checkout master
git pull
git checkout -b sustaining/5.2.x
```

### Step 2 — Prepare files for release and push

See per-repo section for exact files and fields. Throughout this skill, **"If required"** means: check the current value first — if it already matches the target (e.g. the year is already correct, or the release action already bumped the version), skip the change. It does NOT mean the change is optional in principle.

General rules for pom.xml:
- `project.version` → `RELEASE_SNAPSHOT` (e.g. `5.2.0-SNAPSHOT`) — the release action strips `-SNAPSHOT` to produce the final tag
- Root pom of a child repo: `parent.version` → `RELEASE_VERSION` (e.g. `5.2.0`) — references the already-released upstream parent
- Sub-module poms within a child repo: `parent.version` → `RELEASE_SNAPSHOT` (e.g. `5.2.0-SNAPSHOT`) — their parent is this repo's root pom, still at snapshot
- **Parent repo only:** `openig.version` → `IG_RELEASE_VERSION` (e.g. `2026.3.0`)
- If required: `copyright-current-year` → `CURRENT_YEAR`
- If required: pom header comment end date → `CURRENT_YEAR`
- If required: `scm.tag` → `HEAD`

> **Docker sub-module repos** (fapi-pep-as, fapi-pep-rs-core, fapi-pep-rs-ob, test-trusted-directory, rcs, rs): the root pom **must** have an explicit `<version>RELEASE_SNAPSHOT</version>` element. If it is absent, Maven inherits the parent version (now `RELEASE_VERSION`) and the docker sub-module's `parent.version=RELEASE_SNAPSHOT` will fail to resolve. Add the explicit version if not already present.

```bash
git add -p
git commit -m "${JIRA_ID} Prepare SAPIG ${RELEASE_VERSION} release (IG ${IG_RELEASE_VERSION})"
git push origin ${SUSTAINING_BRANCH}
```

### Step 3 — Trigger release GitHub Action

> **Docker sub-module repos only** (fapi-pep-as, fapi-pep-rs-core, fapi-pep-rs-ob, test-trusted-directory, rcs, rs): run a `pr.yml` build **before** triggering the release. The release workflow's `mvn release:prepare` resolves dependencies remotely from Artifactory — it cannot use local disk. The `RELEASE_SNAPSHOT` must already be published there. The `pr.yml` build publishes it as a side effect of the Deploy step.
>
> ```bash
> gh workflow run pr.yml --repo SecureApiGateway/<REPO> --ref sustaining/5.2.x
> gh run watch <run-id> --repo SecureApiGateway/<REPO> --exit-status
> ```

```bash
gh workflow run release.yml \
  --repo SecureApiGateway/<REPO> \
  --ref ${SUSTAINING_BRANCH} \
  --field releaseVersion=${RELEASE_VERSION} \
  --field releaseNotes="Release SAPIG ${RELEASE_VERSION} (IG ${IG_RELEASE_VERSION})"
```

Verify before proceeding:
- New tag `v${RELEASE_VERSION}` at `https://github.com/SecureApiGateway/<REPO>/tags`
- Tag's pom.xml has `project.version` = `RELEASE_VERSION` (no snapshot suffix)
- Sustaining branch pom.xml has `project.version` bumped to `SUSTAINING_SNAPSHOT` (e.g. `5.2.1-SNAPSHOT`)

### Step 4 — Bump sustaining branch to next dev snapshot

```bash
cd <FAPI_ROOT>/<REPO>
git pull   # pick up changes made by the release action
```

The Maven release action automatically bumps `project.version` to `SUSTAINING_SNAPSHOT` on the sustaining branch as part of `mvn release:prepare`. Confirm it happened with:

```bash
grep '<version>' pom.xml | head -3
```

If the version is already `SUSTAINING_SNAPSHOT` (e.g. `5.2.1-SNAPSHOT`), no manual commit is needed — proceed directly to the PR build below. If it is still at `RELEASE_SNAPSHOT` (the release action did not bump it — this is unusual but can happen for Gradle or Helm-only repos), manually update `project.version` → `SUSTAINING_SNAPSHOT` and push:

```bash
git add pom.xml
git commit -m "${JIRA_ID} Bump versions for dev after release of SAPIG ${RELEASE_VERSION}"
git push origin ${SUSTAINING_BRANCH}
```

Manually launch and await completion of the PR build:

```bash
gh workflow run pr.yml \
  --repo SecureApiGateway/<REPO> \
  --ref ${SUSTAINING_BRANCH}
```

### Step 5 — Deploy sustaining artifacts

The PR build does not upload sustaining artifacts. Trigger the merge/deploy action manually:

```bash
gh workflow run merge.yml \
  --repo SecureApiGateway/<REPO> \
  --ref ${SUSTAINING_BRANCH}
```

### Step 6 — Bump master to next development cycle

```bash
cd <FAPI_ROOT>/<REPO>
git checkout master
git pull
git checkout -b openig-10328-post-sapig-520-release
```

Update pom.xml (see per-repo section for exact fields), then:

```bash
git add -A
git commit -m "${JIRA_ID} Bump SAPIG versions for dev after release of SAPIG ${RELEASE_VERSION}"
git push origin ${POST_RELEASE_BRANCH}
gh pr create \
  --repo SecureApiGateway/<REPO> \
  --base master \
  --head ${POST_RELEASE_BRANCH} \
  --title "${JIRA_ID} Bump SAPIG versions for dev after release of SAPIG ${RELEASE_VERSION}" \
  --body "Post-release version bump to ${NEXT_SAPIG_SNAPSHOT} / IG ${NEXT_IG_SNAPSHOT}. Part of SAPIG ${RELEASE_VERSION} release." \
  --reviewer wmorrison365fr --reviewer guillaumelamirand --reviewer rh-fr
```

> **Sub-modules:** For multi-module repos, ALL sub-module `pom.xml` files must have their `parent.version` bumped — not just the root and docker poms. Use the following to verify none are missed before pushing (substituting `RELEASE_SNAPSHOT`):
> ```bash
> find <REPO> -name 'pom.xml' -not -path '*/target/*' | xargs grep -l 'RELEASE_SNAPSHOT'
> ```
> The result should be empty. See per-repo sections for the full list of sub-modules in each repo.

> **PR builds must be linked to the PR:** `gh workflow run pr.yml` triggers a `workflow_dispatch` run that is NOT linked to the PR and will not satisfy branch protection checks. To get a linked build, push an empty commit: `git commit --allow-empty -m "Trigger PR build" && git push`. Always use `--squash` when merging to avoid the empty commit landing on master.

> **Delete dev branches after use:** Once a PR has been merged and is no longer needed, delete the remote dev branch to keep repos clean. Do not delete a branch until all steps that use it are complete — for example, the post-release branch (`POST_RELEASE_BRANCH`) is used only in step 6 and can be deleted once the PR is merged:
> ```bash
> git push origin --delete ${POST_RELEASE_BRANCH}
> ```
> The sustaining branch (`sustaining/5.2.x`) is kept permanently — it is the ongoing development branch for patch releases.

> **Merge in dependency order:** Each repo's merge build publishes its snapshot to Artifactory. A downstream repo's PR build will fail with "Non-resolvable parent POM" if it runs before its upstream's merge build has completed. Do NOT trigger or merge a downstream PR until its upstream repo's PR is merged AND its merge build (merge.yml) has succeeded. Follow this order:
> 1. parent → merge, wait for merge build to pass
> 2. ob-uk-common → merge, wait for merge build to pass
> 3. fapi-pep-as, rs-core, rs-ob, rcs — trigger PR builds in parallel, but only after step 2 is complete; merge all, wait for merge builds to pass
> 4. test-trusted-directory (needs fapi-pep-as merge build), rs (needs rcs merge build) — trigger PR builds only after their respective upstreams' merge builds pass
> 5. functional-tests (needs ob-uk-common merge build — already done by this point)

---

## Per-Repo Details

---

### secure-api-gateway-parent

**Variant:** parent repo — no `<parent>` block (this IS the parent).

Steps 1–6 all apply. Step 5 required.

**Step 2 — `pom.xml` (root):**
- `project.version` → `RELEASE_SNAPSHOT` (e.g. `5.2.0-SNAPSHOT`)
- `openig.version` → `IG_RELEASE_VERSION` (e.g. `2026.3.0`)
- If required: `copyright-current-year` → `CURRENT_YEAR`
- If required: pom header comment end date → `CURRENT_YEAR`
- If required: `scm.tag` → `HEAD`

**Step 4:**
- `git pull` only — `openig.version` stays at `2026.3.0` (IG version is unchanged on the sustaining branch)
- If required: `project.version` → `SUSTAINING_SNAPSHOT` (e.g. `5.2.1-SNAPSHOT`)

**Step 5:** [merge.yml](https://github.com/SecureApiGateway/secure-api-gateway-parent/actions/workflows/merge.yml)

Deployed artifacts:
- [Maven](https://maven.forgerock.org/ui/repos/tree/General/community/com/forgerock/sapi/gateway/secure-api-gateway-parent)
- [Helm](https://maven.forgerock.org/ui/repos/tree/General/forgerock-helm) (requires fropenbanking credentials)
- [Docker](https://console.cloud.google.com/artifacts/docker/sbat-gcr-develop/europe-west4/sapig-docker-artifact)

**Step 6 — `pom.xml` (root):**
- If required: `openig.version` → `NEXT_IG_SNAPSHOT` (e.g. `2026.6.0-SNAPSHOT`)
- If required: `project.version` → `NEXT_SAPIG_SNAPSHOT` (e.g. `5.3.0-SNAPSHOT`)

---

### secure-api-gateway-ob-uk-common

**Variant:** child repo, multi-module.

Steps 1–6 all apply. Step 5 required.

**Step 2 — pom.xml files:**

`pom.xml` (root):
- `project.version` → `RELEASE_SNAPSHOT`
- `parent.version` → `RELEASE_VERSION` (references the released `secure-api-gateway-parent`)
- If required: pom header comment end date → `CURRENT_YEAR`
- If required: `scm.tag` → `HEAD`

Each sub-module (`secure-api-gateway-ob-uk-common-bom`, `-datamodel`, `-error`, `-obie-datamodel`, `-shared`) — `pom.xml`:
- `parent.version` → `RELEASE_SNAPSHOT` (references this repo's root pom, still at snapshot)
- If required: pom header comment end date → `CURRENT_YEAR`

**Step 4:** If required: `project.version` → `SUSTAINING_SNAPSHOT`

**Step 5:** [merge.yml](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-common/actions/workflows/merge.yml)

**Step 6 — pom.xml files:**

`pom.xml` (root):
- If required: `parent.version` → `NEXT_SAPIG_SNAPSHOT`
- If required: `project.version` → `NEXT_SAPIG_SNAPSHOT`

Each sub-module `pom.xml`:
- If required: `parent.version` → `NEXT_SAPIG_SNAPSHOT`

---

### secure-api-gateway-fapi-pep-as

**Variant:** child repo with Docker sub-module.

Steps 1–6 all apply. Step 5 required.

**Step 2 — files:**

`pom.xml` (root):
- `project.version` → `RELEASE_SNAPSHOT` (if present — may be inherited)
- `parent.version` → `RELEASE_VERSION` (references the released `secure-api-gateway-parent`)
- If required: pom header comment end date → `CURRENT_YEAR`

`secure-api-gateway-fapi-pep-as-docker/pom.xml`:
- `parent.version` → `RELEASE_SNAPSHOT` (references this repo's root pom, still at snapshot)
- If required: pom header comment end date → `CURRENT_YEAR`

`secure-api-gateway-fapi-pep-as-docker/src/main/docker/Dockerfile`:
- If required: Dockerfile header comment end date → `CURRENT_YEAR`
- Note: the IG base image version is controlled by the Maven property `docker.openig-image` (set in the parent pom via `openig.version`), not an `ARG` in the Dockerfile. No Dockerfile version change is needed here.

**Step 4:** If required: `project.version` → `SUSTAINING_SNAPSHOT`

**Step 5:** [merge.yml](https://github.com/SecureApiGateway/secure-api-gateway-fapi-pep-as/actions/workflows/merge.yml)

**Step 6 — files:**

`pom.xml` (root):
- If required: `parent.version` → `NEXT_SAPIG_SNAPSHOT`
- If required: `project.version` → `NEXT_SAPIG_SNAPSHOT`

`secure-api-gateway-fapi-pep-as-docker/pom.xml`:
- If required: `parent.version` → `NEXT_SAPIG_SNAPSHOT`

No Dockerfile changes needed in step 6 — the IG base image version flows through the parent pom.

---

### secure-api-gateway-fapi-pep-rs-core

Same as `secure-api-gateway-fapi-pep-as`. Substitutions:
- Repo: `secure-api-gateway-fapi-pep-rs-core`
- Docker sub-module: `secure-api-gateway-fapi-pep-rs-core-docker`
- [release.yml](https://github.com/SecureApiGateway/secure-api-gateway-fapi-pep-rs-core/actions/workflows/release.yml)
- [merge.yml](https://github.com/SecureApiGateway/secure-api-gateway-fapi-pep-rs-core/actions/workflows/merge.yml)

---

### secure-api-gateway-fapi-pep-rs-ob

Same as `secure-api-gateway-fapi-pep-as`. Substitutions:
- Repo: `secure-api-gateway-fapi-pep-rs-ob`
- Docker sub-module: `secure-api-gateway-fapi-pep-rs-ob-docker`
- [release.yml](https://github.com/SecureApiGateway/secure-api-gateway-fapi-pep-rs-ob/actions/workflows/release.yml)
- [merge.yml](https://github.com/SecureApiGateway/secure-api-gateway-fapi-pep-rs-ob/actions/workflows/merge.yml)

**Additional sub-module for step 6:** `secure-api-gateway-ig-extensions-ob/pom.xml` — `parent.version` → `NEXT_SAPIG_SNAPSHOT`

---

### secure-api-gateway-test-trusted-directory

Same as `secure-api-gateway-fapi-pep-as`, with one extra change in Step 2. Substitutions:
- Repo: `secure-api-gateway-test-trusted-directory`
- Docker sub-module: `secure-api-gateway-test-trusted-directory-docker`
- [release.yml](https://github.com/SecureApiGateway/secure-api-gateway-test-trusted-directory/actions/workflows/release.yml)
- [merge.yml](https://github.com/SecureApiGateway/secure-api-gateway-test-trusted-directory/actions/workflows/merge.yml)

**Additional Step 2 change — `pom.xml` (root):**
- Set property `secure-api-gateway.fapi-pep-as.version` → `RELEASE_VERSION` (e.g. `5.2.0`)

**Additional sub-module for step 6:** `secure-api-gateway-test-trusted-directory-ig-extensions/pom.xml` — `parent.version` → `NEXT_SAPIG_SNAPSHOT`

---

### secure-api-gateway-ob-uk-rcs

Same as `secure-api-gateway-fapi-pep-as`. Substitutions:
- Repo: `secure-api-gateway-ob-uk-rcs`
- Docker sub-module: **`secure-api-gateway-ob-uk-rcs-server`** (not `-docker`)
- Dockerfile path: `secure-api-gateway-ob-uk-rcs-server/docker/Dockerfile`
- [release.yml](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rcs/actions/workflows/release.yml)
- [merge.yml](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rcs/actions/workflows/merge.yml)

**Additional sub-modules for step 6** — `parent.version` → `NEXT_SAPIG_SNAPSHOT` in each:
- `secure-api-gateway-ob-uk-rcs-api/pom.xml`
- `secure-api-gateway-ob-uk-rcs-cloud-client/pom.xml`
- `secure-api-gateway-ob-uk-rcs-consent-store/pom.xml`
- `secure-api-gateway-ob-uk-rcs-consent-store/secure-api-gateway-ob-uk-rcs-consent-store-api/pom.xml`
- `secure-api-gateway-ob-uk-rcs-consent-store/secure-api-gateway-ob-uk-rcs-consent-store-client/pom.xml`
- `secure-api-gateway-ob-uk-rcs-consent-store/secure-api-gateway-ob-uk-rcs-consent-store-datamodel/pom.xml`
- `secure-api-gateway-ob-uk-rcs-consent-store/secure-api-gateway-ob-uk-rcs-consent-store-repo/pom.xml`

---

### secure-api-gateway-ob-uk-rs

Same as `secure-api-gateway-fapi-pep-as`. Substitutions:
- Repo: `secure-api-gateway-ob-uk-rs`
- Docker sub-module: **`secure-api-gateway-ob-uk-rs-server`** (not `-docker`)
- Dockerfile path: `secure-api-gateway-ob-uk-rs-server/docker/Dockerfile`
- [release.yml](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rs/actions/workflows/release.yml)
- [merge.yml](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-rs/actions/workflows/merge.yml)

**Additional sub-modules for step 6** — also has `uk.bom.version` and `consent.api.version` in root pom → `NEXT_SAPIG_SNAPSHOT`. Sub-modules with `parent.version` → `NEXT_SAPIG_SNAPSHOT`:
- `secure-api-gateway-ob-uk-rs-obie-api/pom.xml`
- `secure-api-gateway-ob-uk-rs-backoffice-api/pom.xml`
- `secure-api-gateway-ob-uk-rs-cloud-client/pom.xml`
- `secure-api-gateway-ob-uk-rs-validation/pom.xml`
- `secure-api-gateway-ob-uk-rs-validation/secure-api-gateway-ob-uk-rs-validation-core/pom.xml`
- `secure-api-gateway-ob-uk-rs-validation/secure-api-gateway-ob-uk-rs-validation-obie/pom.xml`
- `secure-api-gateway-ob-uk-rs-resource-store/pom.xml`
- `secure-api-gateway-ob-uk-rs-resource-store/secure-api-gateway-ob-uk-rs-resource-store-api/pom.xml`
- `secure-api-gateway-ob-uk-rs-resource-store/secure-api-gateway-ob-uk-rs-resource-store-repo/pom.xml`
- `secure-api-gateway-ob-uk-rs-resource-store/secure-api-gateway-ob-uk-rs-resource-store-datamodel/pom.xml`

---

### secure-api-gateway-ob-uk-ui

**SKIP** — sample application on outdated technology. Remains on version `5.0.6`. No action required.

---

### secure-api-gateway-ob-uk-fidc-initializer

**TAG ONLY** — no release workflow, no sustaining branch, no steps 2–6.

```bash
cd <FAPI_ROOT>/secure-api-gateway-ob-uk-fidc-initializer
git checkout master
git pull
git tag v${RELEASE_VERSION}
git push origin v${RELEASE_VERSION}
```

---

### secure-api-gateway-ob-uk-test-data-initializer

**Variant:** child repo with Docker sub-module + Helm chart. Steps 1–3 and 5 apply. **Steps 4 and 6 are excluded.**

**Step 1:** Standard (creates `sustaining/5.2.x` from master).

**Step 2 — files:**

No pom.xml or Dockerfile changes. Only the helm chart:
- `_infra/helm/securebanking-test-data-initializer/Chart.yaml`:
  - `version` → `RELEASE_VERSION` (e.g. `5.2.0`)
  - `appVersion` → `RELEASE_VERSION` (e.g. `5.2.0`)

**Step 3:** [release.yml](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-test-data-initializer/actions/workflows/release.yml)

**Step 4:** Excluded.

**Step 5:** [merge.yml](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-test-data-initializer/actions/workflows/merge.yml)

**Step 6:** Excluded.

---

### fr-platform-config

**Variant:** branch only + release workflow. **Only steps 1 and 3 apply. Steps 2, 4, 5, 6 are excluded.**

**Step 1:** Standard (creates `sustaining/5.2.x` from master).

**Step 2:** Excluded — no file changes needed.

**Step 3:** [release.yml](https://github.com/SecureApiGateway/fr-platform-config/actions/workflows/release.yml) — run against the sustaining branch.

**Steps 4, 5, 6:** Excluded.

---

### secure-api-gateway-ob-uk-functional-tests

**Variant:** child repo, Gradle (no pom.xml — update `build.gradle.kts` instead).

Steps 1–6 all apply.

**Step 2 — `build.gradle.kts`:**
- `version` → `RELEASE_VERSION` (e.g. `5.2.0`) — note: no `-SNAPSHOT` suffix; the release action does not strip it here
- BOM dependency: `implementation(platform("com.forgerock.sapi.gateway:secure-api-gateway-ob-uk-common-bom:${RELEASE_VERSION}"))`

**Step 3:** [release.yml](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-functional-tests/actions/workflows/release.yml)

**Step 4:** If required: `version` → `SUSTAINING_SNAPSHOT` (e.g. `5.2.1-SNAPSHOT`) in `build.gradle.kts`.

**Step 5:** [merge.yml](https://github.com/SecureApiGateway/secure-api-gateway-ob-uk-functional-tests/actions/workflows/merge.yml)

**Step 6 — `build.gradle.kts`:**
- `version` → `NEXT_SAPIG_SNAPSHOT` (e.g. `5.3.0-SNAPSHOT`)
- BOM dependency: `implementation(platform("com.forgerock.sapi.gateway:secure-api-gateway-ob-uk-common-bom:${NEXT_SAPIG_SNAPSHOT}"))`

---

### openig-fapi-tests

> **CAUTION: New process — treat with care and verify each step.**

This module lives inside the [ping-rocks/openig repo](https://github.com/ping-rocks/openig/tree/master/openig-fapi-tests/functional).
It replaces the former `secure-api-gateway-functional-test-framework` repo.
IG itself is already released before this step runs. The openig repo is at `OPENIG_ROOT`.

The `build.gradle.kts` is at: `openig-fapi-tests/functional/build.gradle.kts`

> **Merging ping-rocks/openig PRs:** `gh pr merge` returns "base branch policy prohibits the merge" immediately even when all checks are green — auto-merge is also disabled on this repo. After creating each PR, poll until `mergeStateStatus` is `MERGEABLE` then retry:
> ```bash
> PR_NUMBER=<pr number>
> gh auth switch --user ${RUNNER_PING_ROCKS_ACCOUNT}
> while true; do
>   STATUS=$(gh pr view ${PR_NUMBER} --repo ping-rocks/openig --json mergeStateStatus -q .mergeStateStatus)
>   [ "$STATUS" = "MERGEABLE" ] && gh pr merge ${PR_NUMBER} --repo ping-rocks/openig --squash --delete-branch && break
>   echo "Status: $STATUS — waiting 30s..."; sleep 30
> done
> gh auth switch --user ${RUNNER_SAPIG_ACCOUNT}
> ```

**Step 1 — Prepare existing sustaining branch:**

The sustaining branch (`${IG_SUSTAINING_BRANCH}`) already exists in the openig repo — do not create it.

```bash
cd <OPENIG_ROOT>
git fetch upstream
git checkout ${IG_SUSTAINING_BRANCH}
git pull upstream ${IG_SUSTAINING_BRANCH}
git checkout -b ${JIRA_ID_LOWER}-release-openig-fapi-tests
```

**Step 2 — `openig-fapi-tests/functional/build.gradle.kts`:**
- `version` → `IG_RELEASE_VERSION` (e.g. `2026.3.0`) — strip the `-SNAPSHOT` suffix

```bash
git add openig-fapi-tests/functional/build.gradle.kts
git commit -m "${JIRA_ID} Prepare release of openig-fapi-tests (IG ${IG_RELEASE_VERSION})"
git push origin ${JIRA_ID_LOWER}-release-openig-fapi-tests
```

Raise PR against `${IG_SUSTAINING_BRANCH}` for review and merge. Switch to the ping-rocks account first:

```bash
gh auth switch --user ${RUNNER_PING_ROCKS_ACCOUNT}
gh pr create \
  --repo ping-rocks/openig \
  --base ${IG_SUSTAINING_BRANCH} \
  --head ${RUNNER_PING_ROCKS_ACCOUNT}:${JIRA_ID_LOWER}-release-openig-fapi-tests \
  --title "${JIRA_ID} Prepare release of openig-fapi-tests (IG ${IG_RELEASE_VERSION})" \
  --body "$(cat <<'PREOF'
Prepare openig-fapi-tests for SAPIG ${RELEASE_VERSION} / IG ${IG_RELEASE_VERSION} release. Part of SAPIG ${RELEASE_VERSION} release (${JIRA_ID}).

---
## Checklist before merging:
- [x] Launch complete PyForge run
- [x] Review your commits
- [x] Check the merge status in Slack #ig-engineering
- [x] Check if TypeProviders need to be updated
PREOF
)" \
  --reviewer wayne-morrison_pingcorp --reviewer guillaumelamirand_pingcorp --reviewer richard-hruza_pingcorp
gh auth switch --user ${RUNNER_SAPIG_ACCOUNT}
```

Wait for the PR to be merged before proceeding to step 3.

**Step 3 — Build and push docker image manually**

> **TEMPORARY — remove for IG 2026.6.0:** The `fapi-ft-release.yml` workflow cannot be used here because the reusable release workflow assumes a git tag exists in `ping-rocks/openig`, which is not created for this component. Once the openig-fapi-tests migration is complete (targeted for IG 2026.6.0), this entire repo entry should be removed from the release process.

Build locally from `${IG_SUSTAINING_BRANCH}` (which has `version = "${IG_RELEASE_VERSION}"`) and push both tags to `sbat-gcr-release`:

```bash
cd <OPENIG_ROOT>/openig-fapi-tests/functional
docker build \
  -t europe-west4-docker.pkg.dev/sbat-gcr-release/sapig-docker-artifact/securebanking/uk-core-functional-tests:${IG_RELEASE_VERSION} \
  -t europe-west4-docker.pkg.dev/sbat-gcr-release/sapig-docker-artifact/securebanking/uk-core-functional-tests:${RELEASE_VERSION} \
  .
docker push europe-west4-docker.pkg.dev/sbat-gcr-release/sapig-docker-artifact/securebanking/uk-core-functional-tests:${IG_RELEASE_VERSION}
docker push europe-west4-docker.pkg.dev/sbat-gcr-release/sapig-docker-artifact/securebanking/uk-core-functional-tests:${RELEASE_VERSION}
```

Prerequisites: Docker daemon running; gcloud authenticated with access to `sbat-gcr-release`; docker configured for `europe-west4-docker.pkg.dev` (`gcloud auth configure-docker europe-west4-docker.pkg.dev`).

Post-release verification:
- Both tags (`${IG_RELEASE_VERSION}` and `${RELEASE_VERSION}`) visible at [sbat-gcr-release/sapig-docker-artifact/securebanking/uk-core-functional-tests](https://console.cloud.google.com/artifacts/docker/sbat-gcr-release/europe-west4/sapig-docker-artifact/securebanking%2Fuk-core-functional-tests?project=sbat-gcr-release)
- There is NO git tag in `ping-rocks/openig` — the docker image is the release artefact
- Sustaining branch `build.gradle.kts` version stays at `${IG_RELEASE_VERSION}` (no auto-bump)

**Step 4 — Bump sustaining branch to next IG sustaining snapshot:**

The release workflow does not auto-bump the version. Manually bump on the same release branch used in step 2 (or create a new branch from sustaining):

`openig-fapi-tests/functional/build.gradle.kts`:
- `version` → IG sustaining snapshot (e.g. `2026.3.1-SNAPSHOT`) — increment the IG patch version by 1 and add `-SNAPSHOT`

```bash
cd <OPENIG_ROOT>
git checkout ${IG_SUSTAINING_BRANCH}
git pull upstream ${IG_SUSTAINING_BRANCH}
git checkout -b ${JIRA_ID_LOWER}-bump-openig-fapi-tests-sustaining
git add openig-fapi-tests/functional/build.gradle.kts
git commit -m "${JIRA_ID} Bump openig-fapi-tests version for dev after release of IG ${IG_RELEASE_VERSION}"
git push origin ${JIRA_ID_LOWER}-bump-openig-fapi-tests-sustaining
```

Raise PR against `${IG_SUSTAINING_BRANCH}` for review and merge. Switch to the ping-rocks account first:

```bash
gh auth switch --user ${RUNNER_PING_ROCKS_ACCOUNT}
gh pr create \
  --repo ping-rocks/openig \
  --base ${IG_SUSTAINING_BRANCH} \
  --head ${RUNNER_PING_ROCKS_ACCOUNT}:${JIRA_ID_LOWER}-bump-openig-fapi-tests-sustaining \
  --title "${JIRA_ID} Bump openig-fapi-tests version for dev after release of IG ${IG_RELEASE_VERSION}" \
  --body "$(cat <<'PREOF'
Post-release version bump to IG sustaining snapshot. Part of SAPIG ${RELEASE_VERSION} release (${JIRA_ID}).

---
## Checklist before merging:
- [x] Launch complete PyForge run
- [x] Review your commits
- [x] Check the merge status in Slack #ig-engineering
- [x] Check if TypeProviders need to be updated
PREOF
)" \
  --reviewer wayne-morrison_pingcorp --reviewer guillaumelamirand_pingcorp --reviewer richard-hruza_pingcorp
gh auth switch --user ${RUNNER_SAPIG_ACCOUNT}
```

**Step 5:** [fapi-ft-merge.yml](https://github.com/ping-rocks/openig/actions/workflows/fapi-ft-merge.yml)

After the step 4 PR is merged, trigger the merge/deploy workflow:

```bash
gh workflow run fapi-ft-merge.yml \
  --repo ping-rocks/openig \
  --ref ${IG_SUSTAINING_BRANCH}
```

**Step 6 — master post-release bump:**

```bash
cd <OPENIG_ROOT>
git checkout master
git pull upstream master
git checkout -b ${JIRA_ID_LOWER}-post-release-openig-fapi-tests
```

`openig-fapi-tests/functional/build.gradle.kts`:
- `version` → `NEXT_IG_SNAPSHOT` (e.g. `2026.6.0-SNAPSHOT`)

```bash
git add openig-fapi-tests/functional/build.gradle.kts
git commit -m "${JIRA_ID} Bump openig-fapi-tests IG version for dev after release of IG ${IG_RELEASE_VERSION}"
git push origin ${JIRA_ID_LOWER}-post-release-openig-fapi-tests
```

Raise PR against `master` for review and merge. Switch to the ping-rocks account first:

```bash
gh auth switch --user ${RUNNER_PING_ROCKS_ACCOUNT}
gh pr create \
  --repo ping-rocks/openig \
  --base master \
  --head ${RUNNER_PING_ROCKS_ACCOUNT}:${JIRA_ID_LOWER}-post-release-openig-fapi-tests \
  --title "${JIRA_ID} Bump openig-fapi-tests IG version for dev after release of IG ${IG_RELEASE_VERSION}" \
  --body "$(cat <<'PREOF'
Post-release version bump to ${NEXT_IG_SNAPSHOT}. Part of SAPIG ${RELEASE_VERSION} release (${JIRA_ID}).

---
## Checklist before merging:
- [x] Launch complete PyForge run
- [x] Review your commits
- [x] Check the merge status in Slack #ig-engineering
- [x] Check if TypeProviders need to be updated
PREOF
)" \
  --reviewer wayne-morrison_pingcorp --reviewer guillaumelamirand_pingcorp --reviewer richard-hruza_pingcorp
gh auth switch --user ${RUNNER_SAPIG_ACCOUNT}
```

---

### secure-api-gateway-releases

**HELM ONLY** — no sustaining branch, no Maven/Gradle. Uses a dev branch off master; the release workflow tags master directly.

**Step 1 — Prepare master:**

```bash
cd <FAPI_ROOT>/secure-api-gateway-releases
git checkout master
git pull
git checkout -b openig-10328-post-sapig-520-release
```

**Step 2 — Helm chart updates:**

`core/secure-api-gateway-core/Chart.yaml`:
- `version` → `RELEASE_VERSION`
- `appVersion` → `RELEASE_VERSION`
- All dependency `version` values → `RELEASE_VERSION`

`ob/secure-api-gateway-ob/Chart.yaml`:
- `version` → `RELEASE_VERSION`
- `appVersion` → `RELEASE_VERSION`
- All dependency `version` values → `RELEASE_VERSION` — **except** `remote-consent-service-user-interface`, which stays on `5.0.6`

`secure-api-gateway-helpers/Chart.yaml`:
- `version` → `RELEASE_VERSION`
- `appVersion` → `RELEASE_VERSION`
- All dependency `version` values → `RELEASE_VERSION`

`third-party/Chart.yaml`:
- `version` → `RELEASE_VERSION`
- `appVersion` → `RELEASE_VERSION`

```bash
git commit -m "${JIRA_ID} Bump versions for SAPIG ${RELEASE_VERSION} release (IG ${IG_RELEASE_VERSION})"
git push origin ${POST_RELEASE_BRANCH}
```

Raise PR against `master` for review and merge.

**Step 3 — Release workflow (run from master after PR merges):**

[release.yml](https://github.com/SecureApiGateway/secure-api-gateway-releases/actions/workflows/release.yml)
- branch: `master`
- version: `${RELEASE_VERSION}`
- release notes: `Release SAPIG ${RELEASE_VERSION} (IG ${IG_RELEASE_VERSION})`

Verify: new tag `v${RELEASE_VERSION}` at [secure-api-gateway-releases tags](https://github.com/SecureApiGateway/secure-api-gateway-releases/tags).

**Step 4 — Slack notification (runs automatically on push to master):**

[slackNotification.yml](https://github.com/SecureApiGateway/secure-api-gateway-releases/actions/workflows/slackNotification.yml)
