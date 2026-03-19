FROM node:24-alpine AS builder

WORKDIR /app

COPY site/package*.json ./site/
RUN npm --prefix site ci

COPY posts/ ./posts/
COPY site/ ./site/

RUN npm --prefix site run build

FROM nginx:stable-alpine

COPY --from=builder /app/site/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
