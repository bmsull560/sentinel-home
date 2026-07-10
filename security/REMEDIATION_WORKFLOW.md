# Security Remediation Workflow

This workflow ensures penetration test findings are tracked, fixed, verified, and approved before production release.

## Roles

| Role            | Responsibility                                                  |
| --------------- | --------------------------------------------------------------- |
| Security Team   | Validates findings, assigns severity, reviews fixes             |
| Finding Owner   | Implements remediation and writes verification evidence         |
| QA / SRE        | Re-tests the fix in a non-production environment                |
| Release Manager | Blocks or approves production deployment based on open findings |

## Workflow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Finding   │───▶│   Triage     │───▶│   Assign    │───▶│    Fix      │───▶│   Verify    │
│  Reported   │    │  & Severity  │    │   Owner     │    │             │    │             │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                                      │
                                                                                      ▼
                                                                             ┌─────────────┐
                                                                             │   Close     │
                                                                             │   Finding   │
                                                                             └─────────────┘
```

### 1. Triage

- Confirm the finding is reproducible.
- Assign severity using CVSS v3.1.
- Identify affected components and owners.
- Record the finding in `security/findings/SH-YYYY-MM-###.md` using `security/FINDINGS_TEMPLATE.md`.

### 2. Prioritization

| Severity      | Action                                                          |
| ------------- | --------------------------------------------------------------- |
| Critical      | Fix within 24–48 hours; block release until verified            |
| High          | Fix within 1 week; block release until verified                 |
| Medium        | Fix within 2–4 weeks; document plan if not fixed before release |
| Low           | Schedule in next maintenance window                             |
| Informational | Accept or backlog; no release block                             |

### 3. Fix

- Create a branch/PR referencing the finding ID.
- Implement remediation with tests where possible.
- Update relevant documentation (runbooks, AGENTS.md, architecture docs).
- Run automated security checks: `pnpm security:checks`

### 4. Verify

- Owner demonstrates the fix with evidence (logs, test output, screenshots).
- Security Team or QA re-tests in a non-production environment.
- For Critical/High findings, run the original exploit scenario and confirm it no longer works.

### 5. Close

- Update the finding file status to `Verified`.
- Merge the remediation PR.
- Release Manager confirms no open Critical/High findings before production deployment.

## Production Approval Gate

A release to production requires:

1. Zero open **Critical** findings.
2. Zero open **High** findings.
3. All **Medium** findings either closed or formally risk-accepted by the Security Team.
4. Automated security checks pass in CI.
5. Final sign-off from Security Team and Release Manager.

## Continuous Security

- Run `scripts/security-checks.js` in CI on every PR.
- Schedule quarterly automated vulnerability scans (dependency audit, container scan).
- Re-engage the penetration tester annually or after major architectural changes.
