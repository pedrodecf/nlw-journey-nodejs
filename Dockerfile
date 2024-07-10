FROM node:20.4.0

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

ENV DOCKERIZE_VERSION v0.7.0

RUN apt-get update \
    && apt-get install -y wget \
    && wget -O - https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz | tar xzf - -C /usr/local/bin \
    && apt-get autoremove -yqq --purge wget && rm -rf /var/lib/apt/lists/*

RUN npm install -g nodemon

EXPOSE 3000

CMD ["dockerize", "-wait", "tcp://nlw-db:5432", "-timeout", "20s", "sh", "-c", "npx prisma migrate dev && nodemon --watch . --ext js,ts,json --exec npm run dev"]
