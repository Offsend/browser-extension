# Security Policy

Offsend is a privacy-and-security tool, so we take reports seriously and aim to
respond quickly.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Instead, report privately via either:

- GitHub's [private vulnerability reporting](https://github.com/offsend/browser-extension/security/advisories/new)
  (Security → Report a vulnerability), or
- Email: **saman1303@gmail.com** with the subject `SECURITY: Offsend extension`.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (a proof of concept if possible).
- Affected version / commit and browser.

We will acknowledge your report within **72 hours** and keep you updated on the
fix. Please give us a reasonable window to release a fix before any public
disclosure.

## Scope

Especially relevant for this project:

- Sensitive content leaving the device (the extension is designed so it never does).
- Leakage or weakening of Restore mapping encryption / key handling.
- Bypass of detection or masking that exposes secrets to AI sites.
- XSS or content-script injection from a host AI site into the extension UI.

## Supported versions

This project is pre-1.0; only the latest `main` is supported for security fixes.
