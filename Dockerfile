FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Maak scripts directory en kopieer het admin script
RUN mkdir -p scripts
COPY scripts/createAdmin.js scripts/

EXPOSE 3000

CMD ["npm", "start"]