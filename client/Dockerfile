FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

COPY ./ /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/docker /usr/share/nginx/html/Dockerfile

COPY docker/default.conf /etc/nginx/conf.d/default.conf
COPY docker/50-env-config.sh /docker-entrypoint.d/50-env-config.sh
RUN chmod +x /docker-entrypoint.d/50-env-config.sh

ENV API_BASE_URL=http://localhost:82

EXPOSE 80 443
