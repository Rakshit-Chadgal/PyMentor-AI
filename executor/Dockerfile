FROM python:3.11-slim

WORKDIR /sandbox
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir fastapi uvicorn pydantic && \
    groupadd --gid 10001 sandbox && \
    useradd --uid 10001 --gid 10001 --no-create-home sandbox

COPY app /sandbox/app
USER 10001:10001

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
