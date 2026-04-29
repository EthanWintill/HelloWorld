#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../GreekGeekApi"
export TEST_DB_NAME="${TEST_DB_NAME:-test_greekdb_${USER:-local}_$$}"
../venv/bin/python manage.py test Study "$@"
