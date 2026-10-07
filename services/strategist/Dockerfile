# Stage 1: Build virtual environment using uv
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS builder

WORKDIR /app

# Enable bytecode compilation for faster container startups
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Install dependencies in a separate layer for maximum Docker layer caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Copy the rest of the application code and sync the project
COPY src/ ./src/
COPY pyproject.toml ./
RUN uv sync --frozen --no-dev

# Stage 2: Minimal runtime image for production / AWS (ECS, App Runner, EKS)
FROM python:3.11-slim-bookworm AS runtime

WORKDIR /app

# Set production environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PORT=8000 \
    HOST=0.0.0.0

# Create a non-root user and group for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# Copy virtualenv and application code from builder
COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv
COPY --chown=appuser:appuser src/ /app/src/

USER appuser

# Expose HTTP port
EXPOSE 8000

# Container healthcheck using standard Python runtime against /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, os; port = os.environ.get('PORT', '8000'); urllib.request.urlopen(f'http://localhost:{port}/health')" || exit 1

# Start Uvicorn ASGI server
CMD ["sh", "-c", "exec uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT}"]
