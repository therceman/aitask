---
id: deepseek_003_implement_draft_first_workflow_with_auto_increment_ids_and_p
title: Implement draft-first workflow with auto-increment IDs and publish command
assignee: deepseek
status: done
template: task
tags: 
createdAt: 2026-05-09T10:11:22.534Z
updatedAt: 2026-05-09T10:11:55.857Z
---

Create drafts in tasks/draft/ with auto-increment IDs, publish command moves to tasks/todo/ with deepseek naming, safety checks for collisions/missing files, --dir override for cross-repo publish

# Task Template

## ID
``

## Title
Implement draft-first workflow with auto-increment IDs and publish command

## Objective
-

## Scope
-

## Non-goals
-

## Acceptance Criteria
-

## Validation
- `npm run -s build`
- `npm run -s lint`
- add task-specific checks

## Reporting Contract (Mandatory)
- Start by copying the base stub to a draft file:
  - `cp tasks/report_stub.md tasks/_report_draft.md`
- Fill that draft file only; do not author reports from scratch.
- When the report is complete and validated, rename it to the final path:
  - `mv tasks/_report_draft.md tasks/_report.md`
- Every validation command MUST be listed in the report with exit code.
- Every acceptance criterion MUST be mapped with explicit status (`pass`/`fail`) and evidence.

## Deliverables
- code changes
- report at `tasks/_report.md`