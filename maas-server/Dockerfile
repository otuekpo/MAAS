FROM node:20 AS builder

WORKDIR /usr/src/app

COPY package*.json nest-cli.json tsconfig*.json ./

RUN npm ci

COPY apps/maas-server ./apps/maas-server
COPY libs/database ./libs/database
COPY libs/shared ./libs/shared
COPY libs/email ./libs/email



RUN npx nest build maas-server

FROM node:20-slim AS production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/libs/shared/src/EmailTemplate ./dist/apps/EmailTemplate

EXPOSE 3000

CMD ["node", "dist/apps/maas-server/main.js"]
