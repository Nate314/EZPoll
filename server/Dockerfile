FROM python:3.13-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Pull in OS security fixes released after the base image was built.
RUN apk upgrade --no-cache

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && (python -m pip uninstall -y pip setuptools wheel || true)

# Unprivileged runtime user
RUN adduser -S -D -H -u 10001 ezpoll
COPY --chown=ezpoll:ezpoll . .
USER ezpoll

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD python -c "import socket; socket.create_connection(('127.0.0.1', 5000), 2)" || exit 1

# gunicorn (production WSGI server) instead of the Flask development server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--access-logfile", "-", "api:app"]
