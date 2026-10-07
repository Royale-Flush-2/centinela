FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS builder
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-install-project --no-dev
COPY src/ ./src/
COPY pyproject.toml ./
RUN uv sync --no-dev

FROM python:3.11-slim-bookworm AS runtime
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PATH="/app/.venv/bin:$PATH" PORT=8000 HOST=0.0.0.0 PYTHONPATH="/app/src"
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser
COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv
COPY --chown=appuser:appuser src/ /app/src/
USER appuser
EXPOSE 8000
CMD ["sh", "-c", "python -m api.main"]
