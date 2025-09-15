FROM python:3.10.18-slim-bookworm
WORKDIR /app  # Set the working directory inside the container
COPY requirements.txt .
RUN pip3 install -r requirements.txt
COPY . .
CMD python main.py