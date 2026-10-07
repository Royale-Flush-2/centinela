FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uv run uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT}"]
