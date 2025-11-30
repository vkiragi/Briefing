# Use a small Python base image
FROM python:3.11-slim

# Make Python friendlier in containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Workdir inside the container
WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the actual project code
COPY briefing ./briefing
COPY setup.py ./

# Optional: install as a package, so "briefing" CLI works
RUN pip install --no-cache-dir .

# Default entrypoint: run the CLI
ENTRYPOINT ["briefing"]

# Optional default command if you run the container with no args
CMD ["news"]

# If you are a non-root user
RUN adduser --disabled-password --gecos '' appuser
USER appuser