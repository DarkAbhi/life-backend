FROM python:3.10.11-slim-buster

ENV PIP_DISABLE_PIP_VERSION_CHECK 1
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /code

COPY requirements.txt .

RUN apt update -y && \
    apt install -y netcat && \
    pip install --upgrade pip && \
    pip install -r requirements.txt


COPY ./container-start.sh .
RUN chmod +x /code/container-start.sh

COPY . .

ENTRYPOINT ["/code/container-start.sh"]