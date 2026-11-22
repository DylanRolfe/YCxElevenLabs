FROM python:3.12-slim

# Slim images ship without CA certificates; outbound HTTPS fails without them.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Exec form with a real program. A shell-string CMD crashes the Maritime VM.
CMD ["python", "start.py"]
