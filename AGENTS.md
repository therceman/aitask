# AGENTS.md — Worker Protocol

## Reply Contract

When a message contains `[from=<session>]` at the start, the worker MUST reply back to the sender after completing the requested work using:

```
airelay prompt <sender> "<summary of what was done and where the report file is>"
```

Extract `<sender>` from the `from=` value (e.g. `[from=gpt_master]` → sender is `gpt_master`). The reply should include the report file path so the sender can read it directly. Keep it to 3-5 lines.

## Completion Notification

After finalizing a report (renaming `*_report_draft.md` to `*_report.md`), notify the manager:

```
airelay prompt gpt_master "<task_id>_done"
```

## General Rules

- Always run `npm run build`, `npm test`, and `bash smoke.sh` before marking a task done.
- If validation or tests fail, create a follow-up task rather than hiding failures.
- When creating a task, always set `--assign` to the worker who will execute it.
- Keep replies to `[from=<session>]` senders actionable and brief.
