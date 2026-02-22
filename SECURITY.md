# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | ✅ Yes     |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues to: **security@simplypng.app**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

We will acknowledge receipt within 72 hours and aim to provide a fix or mitigation within 14 days for critical issues.

## Security Model

This MCP server is a **thin adapter** over the SimplyPNG public API. It holds no user credentials itself — API keys are passed by the agent runtime at call time and never stored by this server.

- No database access
- No long-lived secrets stored
- API keys are passed via environment variable (`SIMPLYPNG_API_KEY`) in local mode, or provided per-request in hosted deployments
- All communication with SimplyPNG uses HTTPS
- Download tokens are signed and expire after 1 hour

## Public Repo Notice

This repository is public. Never commit:
- Real API keys (`sp_live_*`)
- `.env` files
- Any internal SimplyPNG infrastructure details
