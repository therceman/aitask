# ADR-001-1: Local Timestamps and Task Audit Rules

## Status
Accepted

## Owner
Core CLI Team

## Date
2026-05-18

## Related
- ADR-001 (AITASK Task Management CLI Architecture)

## Pack Summary
Defines local timestamp format, timezone configuration, path-derived state as sole source of truth, and task audit rules for the AITASK task lifecycle.

## Decision Contract

### Local timestamp format
- Stored format: `YYYY-MM-DD HH:mm:ss` (local time, no UTC offset)
- Configured timezone default: `Europe/Riga`
- No UTC/Z/offset suffix in stored frontmatter timestamps

### Path-derived state
- Task state is derived from directory path (draft/ todo/ done/) only
- No state field in task frontmatter duplicates path-derived state
- Path-derived state remains sole source of truth for task lifecycle

### Task audit rules
- timeline/body audit: task body must not contradict state implied by directory path
- state-transition timestamps: each directory move records a timestamp
- Audit validates: task in done/ has been published, task in todo/ is not a draft

### State-transition timestamp semantics
- `created_at`: set when task first written to draft/
- `published_at`: set when moved from draft/ → todo/
- `completed_at`: set when moved from todo/ → done/
- `superseded_at`: set when moved to superseded/

## Scope

### In Scope
- Local timestamp formatting without timezone suffix
- Path-derived state as sole lifecycle authority
- Task audit validation rules
- State-transition timestamp tracking

### Out of Scope
- UTC-based timestamp storage
- Frontmatter state field as lifecycle authority
- Auto-migration of existing task timestamps
- Git-based timestamp inference

## Engine Core Rules
1. Timestamps stored as local time: `YYYY-MM-DD HH:mm:ss`
2. Configured timezone is `Europe/Riga` (configurable)
3. No UTC/Z/offset suffix in stored frontmatter
4. Task state derived from directory path only
5. Path-derived state is sole source of truth for lifecycle

## Forbidden
- UTC offset suffixes (Z, +00:00, etc.) in stored timestamps
- Frontmatter state field that duplicates or contradicts path-derived state
- Tasks with timestamps that don't match state-transition order
- Silent state transitions without audit trail

## Data / Type Contract
```
frontmatter timestamps:
  created_at: "2026-05-18 08:05:24"
  published_at: "2026-05-18 08:10:00"
  completed_at: "2026-05-18 09:00:00"
  superseded_at: null
```

## Validation Contract
- `npm run -s adr_contract:check` validates ADR contract structure
- Timeline audit: created_at <= published_at <= completed_at for done/ tasks
- Path audit: task in draft/ must not have completed_at

## Implementation Process
1. Add timestamp formatting module with configurable timezone
2. Add path-derived state resolver
3. Add task audit command (`aitask audit`)
4. Add state-transition timestamp tracking to publish/move commands

## Task Coverage
- NO-ADR-T021: Lock this ADR (current task)
- Future: Implement timestamp formatting module
- Future: Implement `aitask audit` command
- Future: Implement state-transition timestamp tracking

## Detailed Design
Timestamps use local time to match developer workflow expectations. Path-derived state eliminates dual-authority conflicts between frontmatter fields and directory location. Task audit ensures lifecycle consistency.

## Rationale
- Local timestamps are human-readable and timezone-aware
- Path-derived state prevents frontmatter drift
- Audit rules catch lifecycle inconsistencies early
- No UTC conversion overhead for local-first CLI tool

## Examples
```
created_at: "2026-05-18 08:05:24"    (Europe/Riga, no Z)
published_at: "2026-05-18 08:10:00"  (valid: after created_at)
completed_at: null                    (task still in todo/)

Invalid:
created_at: "2026-05-18 08:05:24Z"  (UTC suffix forbidden)
published_at: "2026-05-18T08:05:23"  (ISO format, not YYYY-MM-DD HH:mm:ss)
```

## Migration Notes
- Existing tasks without timestamps treated as pre-audit
- Audit command skips or warns on legacy tasks
- No auto-conversion of existing timestamp formats

## Open Questions
- Configurable timezone via .aitaskrc or environment variable?
- Audit auto-fix mode for simple inconsistencies?
- Git-based timestamp fallback for legacy tasks?

## Final Lock
Local timestamps use YYYY-MM-DD HH:mm:ss format with configured timezone (default Europe/Riga), no UTC suffix. Task state is path-derived only — directory location is sole source of truth. Audit validates timestamp ordering and path/state consistency. State transitions record timestamps at each directory move.
