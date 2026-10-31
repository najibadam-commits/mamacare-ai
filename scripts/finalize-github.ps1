<#
.SYNOPSIS
  One-time GitHub setup for MamaCare AI: enables the live demo (Pages), tags v0.1.0,
  creates labels and the four roadmap issues. Safe to re-run.

.USAGE
  Open PowerShell in the project folder, then:
      powershell -ExecutionPolicy Bypass -File scripts\finalize-github.ps1
  Needs: Git and the GitHub CLI (winget install GitHub.cli). You must be an admin of the repo.
#>
$ErrorActionPreference = 'Stop'
$Repo = 'najibadam-commits/mamacare-ai'
$Tag  = 'v0.1.0'

function Step($m) { Write-Host "`n== $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "   OK: $m" -ForegroundColor Green }
function Warn($m) { Write-Host "   NOTE: $m" -ForegroundColor Yellow }

# gh writes harmless notices to stderr; don't let them abort the script.
function GhRun { $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'; & gh @args 2>&1; $script:ghExit = $LASTEXITCODE; $ErrorActionPreference = $old }

Step 'Checking tools'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is not installed. Install from https://git-scm.com' }
if (-not (Get-Command gh  -ErrorAction SilentlyContinue)) { throw 'GitHub CLI not found. Run: winget install GitHub.cli   then reopen PowerShell.' }
Ok 'git and gh found'

Step 'Checking GitHub login'
GhRun auth status | Out-Null
if ($script:ghExit -ne 0) {
  Warn 'Not logged in. A browser sign-in will open.'
  & gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw 'GitHub login failed.' }
}
Ok 'logged in'

Step 'Enabling GitHub Pages (source: GitHub Actions)'
$out = GhRun api -X POST "repos/$Repo/pages" -f build_type=workflow
if ($script:ghExit -ne 0) {
  $out = GhRun api -X PUT "repos/$Repo/pages" -f build_type=workflow
  if ($script:ghExit -ne 0) { Warn "Could not set it automatically. Do it by hand: Settings > Pages > Source > GitHub Actions.`n$out" }
  else { Ok 'Pages already existed; source set to GitHub Actions' }
} else { Ok 'Pages enabled' }

Step 'Running the demo deployment'
GhRun workflow run pages.yml --repo $Repo | Out-Null
if ($script:ghExit -eq 0) { Ok 'started. Watch it under the Actions tab (about 2 minutes). Demo: https://najibadam-commits.github.io/mamacare-ai/' }
else { Warn 'Could not start it. Open Actions > "Deploy live demo (GitHub Pages)" > Run workflow.' }

Step "Creating release tag $Tag"
$remoteTags = (& git ls-remote --tags origin) -join "`n"
if ($remoteTags -match "refs/tags/$Tag$") { Ok "$Tag already on GitHub" }
else {
  & git fetch origin main --quiet
  $exists = (& git tag -l $Tag)
  if (-not $exists) { & git tag -a $Tag -m 'MamaCare AI v0.1.0 - pilot candidate (see CHANGELOG.md)' origin/main }
  & git push origin $Tag
  if ($LASTEXITCODE -eq 0) { Ok "$Tag pushed" } else { Warn 'Tag push failed. Use GitHub > Releases > Draft a new release with tag v0.1.0.' }
}
GhRun release view $Tag --repo $Repo | Out-Null
if ($script:ghExit -ne 0) {
  GhRun release create $Tag --repo $Repo --title "MamaCare AI $Tag (pilot candidate)" --notes-file CHANGELOG.md --verify-tag | Out-Null
  if ($script:ghExit -eq 0) { Ok 'GitHub release published' } else { Warn 'Release not created; create it in the GitHub web UI.' }
} else { Ok 'release already exists' }

Step 'Creating labels'
$labels = @(
  @('clinical-safety', 'B60205', 'Affects clinical safety or triage'),
  @('edge-ai',         '5319E7', 'On-device / offline AI work'),
  @('interoperability','0E8A16', 'DHIS2, FHIR and data exchange'),
  @('dpg',             '1D76DB', 'Digital Public Goods alignment'),
  @('enhancement',     'A2EEEF', 'New feature or request'),
  @('documentation',   '0075CA', 'Documentation')
)
foreach ($l in $labels) { GhRun label create $l[0] --repo $Repo --color $l[1] --description $l[2] --force | Out-Null }
Ok 'labels ready'

Step 'Creating roadmap issues'
$issues = @(
  @{ t='feat: Implement numeric blood pressure triage rules (>=140/90 mmHg)';
     l='enhancement,clinical-safety';
     b='Milestone Q1: Add regex/NLP numerical vitals parser for blood pressure readings to trigger deterministic Tier 1 Pre-eclampsia escalation. See ROADMAP.md (M1).' },
  @{ t='feat: Index and verify complete WHO Antenatal Care (ANC) guidelines corpus';
     l='documentation,clinical-safety';
     b='Milestone Q1: Build validated vector embeddings from official WHO IMPAC and ANC clinical protocols with obstetrician review. See ROADMAP.md (M2).' },
  @{ t='feat: Implement ONNX 4-bit/8-bit edge quantization for offline inference';
     l='enhancement,edge-ai';
     b='Milestone Q2: Quantize core SLM models to run with under 1.5GB RAM footprint on ARM64 mobile chipsets without cloud API connectivity. See ROADMAP.md (M4).' },
  @{ t='feat: Build DHIS2 dataValueSets aggregate sync and cli.py exporter';
     l='interoperability,dpg';
     b='Milestone Q3-Q4: Provide standard DPG Indicator 6 non-PII CSV export and DHIS2 store-and-forward sync. See ROADMAP.md (M8, M10).' }
)
$existing = (& gh issue list --repo $Repo --state all --limit 100 --json title --jq '.[].title') -join "`n"
foreach ($i in $issues) {
  if ($existing -like "*$($i.t)*") { Ok "exists: $($i.t)"; continue }
  $url = GhRun issue create --repo $Repo --title $i.t --body $i.b --label $i.l
  if ($script:ghExit -eq 0) { Ok "$url" } else { Warn "Failed: $($i.t)`n$url" }
}

Write-Host "`nDone. Check https://github.com/$Repo/actions and https://github.com/$Repo/issues" -ForegroundColor Green
