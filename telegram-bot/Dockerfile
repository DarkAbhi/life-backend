FROM python:3.10.11-slim-buster
WORKDIR /app  # Set the working directory inside the container
COPY requirements.txt .
RUN pip3 install -r requirements.txt
COPY . .
CMD python main.py