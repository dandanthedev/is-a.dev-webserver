FROM node:latest

# Create the directory!
RUN mkdir -p /usr/src/dev
WORKDIR /usr/src/dev

# Copy and Install our site
COPY package.json /usr/src/dev
RUN apt-get update && apt-get install -y supervisor php-cgi
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
ENV CI=false

RUN npm install
COPY . /usr/src/dev


# Start me!
CMD ["./entrypoint.sh"]
