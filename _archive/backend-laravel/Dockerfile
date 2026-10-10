FROM php:8.3-fpm-alpine AS base
RUN apk add --no-cache git unzip libpq-dev libzip-dev libpng-dev freetype-dev libjpeg-turbo-dev oniguruma-dev \
 && docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install pdo_pgsql pgsql zip gd mbstring bcmath opcache
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html

FROM base AS dev
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

FROM base AS prod
COPY . .
RUN composer install --no-dev --optimize-autoloader --no-interaction \
 && chown -R www-data:www-data storage bootstrap/cache
