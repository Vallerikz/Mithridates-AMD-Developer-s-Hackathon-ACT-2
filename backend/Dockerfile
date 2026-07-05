FROM python:3.8

# Create and change to the app directory.
WORKDIR /app

# Copy the requirements.txt file to the container.
COPY requirements.txt /app/requirements.txt

# Install dependencies.
RUN pip install -r requirements.txt

# Copy the rest of the app to the container.
COPY . /app

# Give permission to run the script
# RUN chmod +x ./core/entrypoint.sh
# ENTRYPOINT ["./core/entrypoint.sh"]
CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "core.wsgi:app", "--reload"]
