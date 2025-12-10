FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn -B -q clean package -DskipTests && cp target/*.jar app.jar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

ENV SERVER_PORT=82 \
    DB_HOST=localhost \
    DB_PORT=3306 \
    DB_NAME=pwa_abarrotes \
    DB_USERNAME=root \
    DB_PASSWORD= \
    SPRING_JPA_HIBERNATE_DDL_AUTO=update \
    SPRING_JPA_FORMAT_SQL=true \
    SPRING_JPA_SHOW_SQL=true \
    JWT_SECRET=52aa49109e4fc36422edbc07251d3eb3646baccae8113a8f279ef248e5b7a0e4

COPY --from=builder /app/app.jar app.jar

EXPOSE 82

ENTRYPOINT ["java", "-jar", "app.jar"]
