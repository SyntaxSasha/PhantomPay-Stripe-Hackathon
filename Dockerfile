# Portable single-service build, for hosts that prefer a container.
FROM node:20-alpine

WORKDIR /app
COPY . .

RUN npm run build

ENV PORT=4242
EXPOSE 4242
CMD ["npm", "start"]
