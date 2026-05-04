FROM node:22-slim

WORKDIR /app

COPY . .

ENV HOST=0.0.0.0
ENV PORT=4174
ENV AISEA_DATA_FILE=/app/data/aisea-store.json

EXPOSE 4174

CMD ["node", "api/server.mjs"]
