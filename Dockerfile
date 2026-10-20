FROM node:22-alpine

ENV NODE_ENV=production \
    APP_ROOT=/app \
    PORT=3000
WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Site (as planilhas de base/ ficam de fora: a pasta é montada como volume no docker-compose).
COPY index.html login.html sistema.html painel.html favicon.ico ./
COPY assets ./assets
COPY server ./server

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/saude || exit 1
CMD ["node", "server/src/index.js"]
