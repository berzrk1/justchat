#!/bin/bash
set -e
uv run alembic upgrade head
exec "$@"
