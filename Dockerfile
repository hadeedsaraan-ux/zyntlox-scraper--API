FROM apify/actor-node-puppeteer-chrome:20

COPY package.json ./

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

RUN npm install --omit=dev

COPY . ./

CMD ["npm", "start"]
