# Finding Template

Use this template for each security finding identified during the penetration test or automated security review.

## Finding ID

`SH-YYYY-MM-###` (e.g. `SH-2026-07-001`)

## Title

Short, descriptive title of the finding.

## Severity

- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low
- [ ] Informational

CVSS v3.1 Score: `X.X`

## Affected Components

- Component 1
- Component 2

## Description

Detailed description of the vulnerability, including how it was discovered and the conditions required to exploit it.

## Proof of Concept

```
Steps, requests, screenshots, or commands demonstrating the issue.
```

## Impact

What an attacker can achieve if this finding is exploited.

## Remediation Guidance

Concrete steps to fix the issue. Include code/config examples where applicable.

## Verification Steps

How to confirm the fix is effective.

## References

- OWASP link
- CWE link
- Relevant code paths or documentation

## Ownership

- **Owner:** @github-handle
- **Team:** platform / backend / security
- **Target date:** YYYY-MM-DD

## Status

- [ ] Open
- [ ] In Progress
- [ ] Fixed
- [ ] Verified
- [ ] Risk Accepted
