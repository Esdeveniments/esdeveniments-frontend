# Incident Reports

This folder contains post-mortem reports for significant production incidents. The goal is to document root causes, impact, and prevention measures to avoid repeating the same mistakes.

## Report Format

Each incident report should include:

1. **Summary** - Brief description of what happened
2. **Impact** - Cost, downtime, user impact
3. **Timeline** - When detected, when resolved
4. **Root Cause** - Technical explanation of why it happened
5. **Resolution** - What was done to fix it
6. **Prevention** - Measures added to prevent recurrence
7. **Lessons Learned** - Key takeaways

## Naming Convention

Files are named: `YYYY-MM-DD-short-description.md`

## Index

| Date       | Incident                                                                   | Impact                                  | Status                |
| ---------- | -------------------------------------------------------------------------- | --------------------------------------- | --------------------- |
| 2026-02-18 | [Sharp Architecture Mismatch](./2026-02-18-sharp-architecture-mismatch.md) | Performance (4 days unoptimized images) | Resolved              |
| 2026-01-20 | [Fetch Cache Explosion](./2026-01-20-fetch-cache-explosion.md)             | Cost                                    | Resolved              |
| 2025-12-28 | [DynamoDB Write Cost Spike](./2025-12-28-dynamodb-write-cost-spike.md)     | $307.50                                 | Resolved              |
| 2025-12-23 | [robots.txt Routing Issues](./2025-12-23-robots-txt-routing-issues.md)     | SEO                                     | Resolved (Workaround) |
