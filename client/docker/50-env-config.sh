#!/bin/sh
set -e

: "${API_BASE_URL:=}"

cat <<EOF >/usr/share/nginx/html/env-config.js
window.__ENV = {
  API_BASE_URL: "${API_BASE_URL}"
};
EOF
