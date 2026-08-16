#!/bin/sh
set -e

# The uploads directory may be a mounted volume owned by root; make sure the
# unprivileged app user can write to it before dropping privileges.
mkdir -p /app/uploads
chown -R ahms:ahms /app/uploads

exec su-exec ahms:ahms /app/ahms-backend
