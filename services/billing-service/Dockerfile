# ---------- Build stage ----------
FROM python:3.11-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------- Runtime stage ----------
FROM python:3.11-slim AS runtime

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

RUN groupadd -r -g 10001 appuser && useradd -r -u 10001 -g appuser -s /sbin/nologin appuser

WORKDIR /app

COPY --from=builder /install /usr/local
COPY ./app ./app

RUN chown -R appuser:appuser /app

USER 10001

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
