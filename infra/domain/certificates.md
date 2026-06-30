# Certificates

This file records the certificate readiness target for `salaryhijacking.com`.
It is not proof that certificates have already been issued.

## Required Hostnames

Certificates must cover:

- `salaryhijacking.com`
- `www.salaryhijacking.com`
- `api.salaryhijacking.com`
- `admin.salaryhijacking.com`
- `notifications.salaryhijacking.com`
- `scheduler.salaryhijacking.com`

## Policy

- Use Cloudflare-managed TLS certificates or another verified managed
  certificate path.
- Do not commit private keys, origin certificates, service account JSON, or
  certificate passwords.
- Verify expiration, issuance status, and host coverage before production
  release.
- Treat `salary-hijacking.app` as an obsolete planning domain unless the user
  explicitly reintroduces it.

## Release Gate

Public release remains blocked until TLS is active for every production hostname
and API/Admin smoke checks pass over HTTPS.
