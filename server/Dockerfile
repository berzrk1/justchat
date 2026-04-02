FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS base

RUN groupadd --system --gid 999 nonroot \
  && useradd --system --gid 999 --uid 999 --create-home nonroot

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_NO_DEV=1
ENV UV_TOOL_BIN_DIR=/usr/local/bin

RUN --mount=type=cache,target=/root/.cache/uv \
  --mount=type=bind,source=uv.lock,target=uv.lock \
  --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
  uv sync --locked --no-install-project

COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --locked

ENV PATH="/app/.venv/bin:$PATH"
RUN chmod +x entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]

FROM base AS dev
CMD ["uv", "run", "fastapi", "dev", "--host", "0.0.0.0", "chat_server/main.py"]

FROM base AS prod
# Install AWS Certs
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && mkdir -p /certs \
  && curl -o /certs/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  && apt-get purge -y curl \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*
USER nonroot
CMD ["uv", "run", "fastapi", "run", "--host", "0.0.0.0", "--workers", "4", "chat_server/main.py"]
