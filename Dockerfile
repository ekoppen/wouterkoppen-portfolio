FROM node:18-alpine

# Installeer wget voor health checks
RUN apk add --no-cache wget

# Maak een niet-root gebruiker aan
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Maak uploads directory en zet de juiste permissies
RUN mkdir -p public/uploads && \
    chown -R appuser:appgroup /app && \
    chmod -R 755 /app && \
    chmod -R 777 public/uploads

# Schakel over naar de niet-root gebruiker
USER appuser

EXPOSE 3000

# Voeg health check toe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:3000/health || exit 1

CMD ["npm", "start"] 