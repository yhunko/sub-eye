#!/bin/bash
set -euo pipefail

usage() {
    cat <<'EOF'
Usage:
  bun run build:ios [BUILD_NUMBER] [--archive-only]
  bun run build:ios --export-only /absolute/path/SubEye.xcarchive

Archives SubEye/Production for a generic iOS device, then exports an App Store
IPA to builds/ios/SubEye.ipa. Build numbers increment automatically; an optional
explicit number advances the local counter (use it when moving to a new Mac).
Each archive uses fresh DerivedData. Existing archives and IPAs are preserved.
The export-only option retries distribution signing without rebuilding.
Use --archive-only to finish signing interactively in Xcode Organizer.
Nothing is uploaded by this command.
EOF
}

fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }
read_plist() { /usr/libexec/PlistBuddy -c "Print :$2" "$1"; }
run_logged() {
    local log_path="$1"
    shift
    "$@" 2>&1 | tee "$log_path"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then usage; exit 0; fi
[[ "$(uname -s)" == Darwin ]] || fail "This command requires macOS and Xcode."
native_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_dir="$(cd "$native_dir/../.." && pwd)"
export_options="$native_dir/Config/ExportOptions-AppStore.plist"
output_dir="$repo_dir/builds/ios"
git_common_dir="$(git -C "$repo_dir" rev-parse --path-format=absolute --git-common-dir)"
state_dir="$git_common_dir/subeye-ios"
state_tool="$native_dir/scripts/build_state.py"
command -v python3 >/dev/null || fail "Python 3 is required (included with Xcode command-line tools)."
archive_only=false

if [[ "${1:-}" == "--export-only" ]]; then
    [[ $# == 2 && -d "$2/Products/Applications/SubEye.app" ]] || fail "Supply an existing SubEye.xcarchive."
    archive_path="$(cd "$2" && pwd)"
    run_dir="$(dirname "$archive_path")"
else
    requested=()
    if [[ "${1:-}" =~ ^[1-9][0-9]*$ ]]; then requested=(--requested "$1"); shift; fi
    if [[ "${1:-}" == "--archive-only" ]]; then archive_only=true; shift; fi
    [[ $# == 0 ]] || { usage >&2; exit 1; }
    [[ -f "$native_dir/Config/Local.xcconfig" ]] || fail "Create apps/ios/Config/Local.xcconfig from Local.xcconfig.example first."
    version="$(awk '/^[[:space:]]*MARKETING_VERSION:/ { print $2; exit }' "$native_dir/project.yml")"
    [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "Invalid MARKETING_VERSION in project.yml."
    initial_build="$(awk '/^[[:space:]]*CURRENT_PROJECT_VERSION:/ { print $2; exit }' "$native_dir/project.yml")"
    build_number="$(python3 "$state_tool" --state-dir "$state_dir" reserve --output-dir "$output_dir" --initial "$initial_build" ${requested[@]+"${requested[@]}"})"
    mkdir -p "$output_dir"
    run_dir="$(mktemp -d "$output_dir/$version-$build_number-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")"
    archive_path="$run_dir/SubEye.xcarchive"
    {
        xcodebuild -version
        printf 'Configuration: Production\nVersion: %s\nBuild: %s\n' "$version" "$build_number"
        git -C "$repo_dir" rev-parse HEAD
        git -C "$repo_dir" status --short
    } > "$run_dir/build-info.txt"
    printf 'Archiving SubEye %s (%s) into %s\n' "$version" "$build_number" "$run_dir"
    # XcodeBuildMCP has no archive/export command; these are Apple's packaging operations.
    run_logged "$run_dir/archive.log" xcodebuild -quiet \
        -project "$native_dir/SubEye.xcodeproj" -scheme SubEye \
        -configuration Production -destination 'generic/platform=iOS' \
        -archivePath "$archive_path" -derivedDataPath "$run_dir/DerivedData" \
        -clonedSourcePackagesDirPath "$output_dir/SourcePackages" \
        -onlyUsePackageVersionsFromResolvedFile -allowProvisioningUpdates \
        "CURRENT_PROJECT_VERSION=$build_number" archive
fi

app_plist="$archive_path/Products/Applications/SubEye.app/Info.plist"
widget_plist="$archive_path/Products/Applications/SubEye.app/PlugIns/SubEyeWidget.appex/Info.plist"
[[ "$(read_plist "$app_plist" CFBundleIdentifier)" == cc.subeye.app ]] || fail "Archive has the wrong app identity."
[[ "$(read_plist "$app_plist" SubEyeNamespace)" == native ]] || fail "Archive is not Production."
[[ "$(read_plist "$widget_plist" CFBundleIdentifier)" == cc.subeye.app.widget ]] || fail "Archive has the wrong widget identity."
archive_version="$(read_plist "$app_plist" CFBundleShortVersionString)"
archive_build="$(read_plist "$app_plist" CFBundleVersion)"
[[ "$(read_plist "$widget_plist" CFBundleShortVersionString)" == "$archive_version" && "$(read_plist "$widget_plist" CFBundleVersion)" == "$archive_build" ]] || fail "App and widget versions differ."
if [[ -n "${build_number:-}" ]]; then
    [[ "$archive_version" == "$version" && "$archive_build" == "$build_number" ]] || fail "Archive version does not match project.yml and the requested build number."
fi
revenuecat_key="$(read_plist "$app_plist" RevenueCatAPIKey)"
brandfetch_id="$(read_plist "$app_plist" BrandfetchClientID)"
[[ "$revenuecat_key" == appl_* && "$revenuecat_key" != *REPLACE* ]] || fail "Archive needs the production RevenueCat public iOS SDK key."
[[ -n "$brandfetch_id" && "$brandfetch_id" != *'$('* ]] || fail "Archive needs the public Brandfetch client ID."

if [[ "$archive_only" == true ]]; then
    printf '\nArchive: %s\n' "$archive_path"
    printf 'Open it in Xcode Organizer: Distribute App > Custom > App Store Connect > Export.\n'
    exit 0
fi

export_dir="$(mktemp -d "$run_dir/export-XXXXXX")"
printf 'Exporting App Store IPA into %s\n' "$export_dir"
if ! run_logged "$export_dir/export.log" xcodebuild -exportArchive \
    -archivePath "$archive_path" -exportPath "$export_dir" \
    -exportOptionsPlist "$export_options" -allowProvisioningUpdates; then
    printf '\nArchive preserved: %s\n' "$archive_path" >&2
    printf 'Check Xcode > Settings > Accounts for team Z6KADG969Z and distribution-signing access.\n' >&2
    printf 'If Xcode sees the account but the CLI does not, export this archive in Organizer using cloud-managed signing.\n' >&2
    printf 'Retry: bun run build:ios --export-only "%s"\n' "$archive_path" >&2
    exit 1
fi
[[ -f "$export_dir/SubEye.ipa" ]] || fail "Export completed without SubEye.ipa; inspect $export_dir/export.log."
python3 "$state_tool" --state-dir "$state_dir" publish \
    --source "$export_dir/SubEye.ipa" --destination "$output_dir/SubEye.ipa" \
    --version "$archive_version" --number "$archive_build"
printf '\nIPA: %s/SubEye.ipa\nArchive and dSYMs: %s\n' "$export_dir" "$archive_path"
printf 'Add the IPA to Transporter, Verify, then Deliver when ready.\n'
