# _build/scripts/full_seo_regression.ps1
# Chained regression runner for the 2026-05-21 SEO remediation gates.
# Runs every auditor + every patcher (idempotency check) + the full pytest suite.
# Exit code 0 = all green. Non-zero = failure (script halts on first error).

$ErrorActionPreference = "Stop"
$REPO = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $REPO

function Section($title) {
    Write-Host ""
    Write-Host "=== $title ===" -ForegroundColor Cyan
}

Section "1. Title audit"
python _build/scripts/audit_titles.py
if ($LASTEXITCODE -ne 0) { Write-Host "Titles audit FAILED" -ForegroundColor Red; exit 1 }

Section "2. Image alt audit"
python _build/scripts/audit_image_alts.py
if ($LASTEXITCODE -ne 0) { Write-Host "Image alt audit FAILED" -ForegroundColor Red; exit 1 }

Section "3. HTML validator (html5lib)"
python _build/scripts/validate_html.py
if ($LASTEXITCODE -ne 0) { Write-Host "HTML validator FAILED" -ForegroundColor Red; exit 1 }

Section "4. Strip-h1 idempotency"
python _build/scripts/strip_duplicate_h1.py
python _build/scripts/strip_duplicate_h1_rendered.py

Section "5. Inject favicon idempotency"
python _build/scripts/inject_favicon_rendered.py

Section "6. Title patch idempotency"
python _build/scripts/patch_titles_rendered.py

Section "7. Async CSS patch idempotency"
python _build/scripts/patch_async_css_rendered.py

Section "8. Main-wrapper patch idempotency"
python _build/scripts/wrap_main_rendered.py

Section "9. Widget-defer patch idempotency"
python _build/scripts/patch_widget_defer_rendered.py

Section "10. Full pytest suite"
python -m pytest _build/ -q
if ($LASTEXITCODE -ne 0) { Write-Host "Pytest suite FAILED" -ForegroundColor Red; exit 1 }

Section "11. Git status (should be clean of working-tree changes)"
git -C $REPO status --short

Write-Host ""
Write-Host "All SEO regression gates green." -ForegroundColor Green
exit 0
