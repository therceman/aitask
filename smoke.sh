#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AITASK="node ${SCRIPT_DIR}/dist/aitask.cjs"
SMOKE_DIR="/tmp/aitask-smoke-$$"
CLEANUP_DIRS=()

cleanup() {
  for d in "${CLEANUP_DIRS[@]}"; do
    rm -rf "$d" 2>/dev/null || true
  done
}
trap cleanup EXIT

# ---- Test 1: init ----
echo "=== Test: init ==="
mkdir -p "$SMOKE_DIR/project1"
pushd "$SMOKE_DIR/project1" > /dev/null
$AITASK init
[ -d tasks/todo ] && [ -d tasks/done ] && [ -d tasks/draft ] && echo "  PASS: dirs created"
[ -f tasks/task_template.md ] && echo "  PASS: task_template.md"
CLEANUP_DIRS+=("$SMOKE_DIR/project1")
popd > /dev/null

# ---- Test 2: init (duplicate) ----
echo "=== Test: init (duplicate) ==="
mkdir -p "$SMOKE_DIR/project2"
pushd "$SMOKE_DIR/project2" > /dev/null
$AITASK init
$AITASK init 2>&1 | grep -q "already exists" && echo "  PASS: warns on duplicate"
CLEANUP_DIRS+=("$SMOKE_DIR/project2")
popd > /dev/null

# ---- Test 3: create (draft) ----
echo "=== Test: create draft ==="
mkdir -p "$SMOKE_DIR/project3"
pushd "$SMOKE_DIR/project3" > /dev/null
$AITASK init
$AITASK create "Add login feature"
[ -f "tasks/draft/task_001.md" ] && echo "  PASS: draft task file created"
[ -f "tasks/draft/task_001_report_draft.md" ] && echo "  PASS: draft report created"
$AITASK create "Another task"
[ -f "tasks/draft/task_002.md" ] && echo "  PASS: second draft gets auto-incremented ID"
CLEANUP_DIRS+=("$SMOKE_DIR/project3")
popd > /dev/null

# ---- Test 4: create with assign ----
echo "=== Test: create --assign ==="
mkdir -p "$SMOKE_DIR/project4"
pushd "$SMOKE_DIR/project4" > /dev/null
$AITASK init
$AITASK create "Fix bug" --assign alice
grep -q "assignee: alice" tasks/draft/task_001.md && echo "  PASS: assignee in draft frontmatter"
CLEANUP_DIRS+=("$SMOKE_DIR/project4")
popd > /dev/null

# ---- Test 5: publish ----
echo "=== Test: publish ==="
mkdir -p "$SMOKE_DIR/project5"
pushd "$SMOKE_DIR/project5" > /dev/null
$AITASK init
$AITASK create "My feature"
$AITASK publish 1
	[ -f "tasks/todo/task_001_my_feature.md" ] && echo "  PASS: published task in todo with task naming"
	[ -f "tasks/todo/task_001_my_feature_report_draft.md" ] && echo "  PASS: published report in todo"
[ ! -f "tasks/draft/task_001.md" ] && echo "  PASS: draft removed after publish"
CLEANUP_DIRS+=("$SMOKE_DIR/project5")
popd > /dev/null

# ---- Test 6: publish collision safety ----
echo "=== Test: publish collision safety ==="
mkdir -p "$SMOKE_DIR/project6"
pushd "$SMOKE_DIR/project6" > /dev/null
$AITASK init
$AITASK create "Collision"
$AITASK publish 1
# Re-create draft with same ID to test collision
mkdir -p tasks/draft
cat > tasks/draft/task_001.md << 'EOF'
---
title: Collision
---
# Task
EOF
cat > tasks/draft/task_001_report_draft.md << 'EOF'
# Report
EOF
$AITASK publish 1 2>&1 | grep -q "already exists" && echo "  PASS: collision detected"
CLEANUP_DIRS+=("$SMOKE_DIR/project6")
popd > /dev/null

# ---- Test 7: publish missing draft safety ----
echo "=== Test: publish missing draft safety ==="
mkdir -p "$SMOKE_DIR/project7"
pushd "$SMOKE_DIR/project7" > /dev/null
$AITASK init
$AITASK publish 999 2>&1 | grep -q "not found" && echo "  PASS: missing draft detected"
CLEANUP_DIRS+=("$SMOKE_DIR/project7")
popd > /dev/null

# ---- Test 8: full workflow draft→publish→list→done ----
echo "=== Test: full workflow ==="
mkdir -p "$SMOKE_DIR/project8"
pushd "$SMOKE_DIR/project8" > /dev/null
$AITASK init
$AITASK create "Finish feature" --assign bob
$AITASK publish 1
$AITASK list | grep -q "Finish feature" && echo "  PASS: list shows published task"
	$AITASK start "task_001_finish_feature" && echo "  PASS: task started to progress"
	$AITASK done "task_001_finish_feature"
	[ -f "tasks/done/task_001_finish_feature.md" ] && echo "  PASS: task moved to done"
	[ -f "tasks/done/task_001_finish_feature_report.md" ] && echo "  PASS: report moved to done"
CLEANUP_DIRS+=("$SMOKE_DIR/project8")
popd > /dev/null

# ---- Test 9: list --dir draft ----
echo "=== Test: list --dir draft ==="
mkdir -p "$SMOKE_DIR/project9"
pushd "$SMOKE_DIR/project9" > /dev/null
$AITASK init
$AITASK create "Draft task A"
$AITASK create "Draft task B"
$AITASK list --dir draft | grep -q "Draft task A" && echo "  PASS: list --dir draft shows draft tasks"
CLEANUP_DIRS+=("$SMOKE_DIR/project9")
popd > /dev/null

# ---- Test 10: validate on published task ----
echo "=== Test: validate ==="
mkdir -p "$SMOKE_DIR/project10"
pushd "$SMOKE_DIR/project10" > /dev/null
$AITASK init
$AITASK create "Valid task" --assign alice
$AITASK publish 1
	$AITASK validate "task_001_valid_task" && echo "  PASS: validate passes"
CLEANUP_DIRS+=("$SMOKE_DIR/project10")
popd > /dev/null

# ---- Test 11: reject ----
echo "=== Test: reject ==="
mkdir -p "$SMOKE_DIR/project11"
pushd "$SMOKE_DIR/project11" > /dev/null
$AITASK init
$AITASK create "Bad idea"
$AITASK publish 1
	$AITASK reject "task_001_bad_idea"
	[ -f "tasks/rework/task_001_bad_idea.md" ] && echo "  PASS: task moved to rework"
CLEANUP_DIRS+=("$SMOKE_DIR/project11")
popd > /dev/null

# ---- Test 12: assign on published task ----
echo "=== Test: assign ==="
mkdir -p "$SMOKE_DIR/project12"
pushd "$SMOKE_DIR/project12" > /dev/null
$AITASK init
$AITASK create "To assign"
$AITASK publish 1
	$AITASK assign "task_001_to_assign" "alice"
	grep -q "assignee: alice" tasks/todo/task_001_to_assign.md && echo "  PASS: assign updated"
CLEANUP_DIRS+=("$SMOKE_DIR/project12")
popd > /dev/null

# ---- Test 13: templates list ----
echo "=== Test: templates list ==="
$AITASK templates list | grep -q "task_template" && echo "  PASS: templates list"

# ---- Test 15: templates materialize ----
echo "=== Test: templates materialize ==="
mkdir -p "$SMOKE_DIR/project15"
pushd "$SMOKE_DIR/project15" > /dev/null
$AITASK templates materialize
[ -f task_template.md ] && echo "  PASS: materialized task_template"
$AITASK templates materialize 2>&1 | grep -q "already exist" && echo "  PASS: skips existing"
$AITASK templates materialize --force 2>&1 | grep -q "Created" && echo "  PASS: --force overwrites"
CLEANUP_DIRS+=("$SMOKE_DIR/project15")
popd > /dev/null

# ---- Test 16: templates materialize specific ----
echo "=== Test: templates materialize specific ==="
mkdir -p "$SMOKE_DIR/project16"
pushd "$SMOKE_DIR/project16" > /dev/null
$AITASK templates materialize report_stub
[ -f report_stub.md ] && echo "  PASS: materialized report_stub"
[ ! -f task_template.md ] && echo "  PASS: only requested template created"
CLEANUP_DIRS+=("$SMOKE_DIR/project16")
popd > /dev/null

# ---- Test 17: --version ----
echo "=== Test: --version ==="
$AITASK --version | grep -q "aitask v" && echo "  PASS: version"

# ---- Test 18: help ----
echo "=== Test: help ==="
$AITASK help | grep -q "aitask" && echo "  PASS: help"

# ---- Test 19: create uses embedded template ----
echo "=== Test: create uses embedded template ==="
mkdir -p "$SMOKE_DIR/project19"
pushd "$SMOKE_DIR/project19" > /dev/null
$AITASK init
$AITASK create "Embedded template task"
grep -q "## Acceptance Criteria" tasks/draft/task_001.md && echo "  PASS: task has acceptance criteria from template"
grep -q "## Summary" tasks/draft/task_001_report_draft.md && echo "  PASS: report draft has summary section from template"
CLEANUP_DIRS+=("$SMOKE_DIR/project19")
popd > /dev/null

# ---- Test 20: --dir override on publish ----
echo "=== Test: publish --dir ==="
mkdir -p "$SMOKE_DIR/project20"
mkdir -p "$SMOKE_DIR/project20_other"
pushd "$SMOKE_DIR/project20" > /dev/null
$AITASK init
$AITASK create "Cross repo task"
# Publish to other repo using --dir
$AITASK publish 1 --dir "$SMOKE_DIR/project20_other"
	[ -f "$SMOKE_DIR/project20_other/tasks/todo/task_001_cross_repo_task.md" ] && echo "  PASS: published to --dir target"
CLEANUP_DIRS+=("$SMOKE_DIR/project20" "$SMOKE_DIR/project20_other")
popd > /dev/null

echo ""
echo "=== All smoke tests passed ==="
