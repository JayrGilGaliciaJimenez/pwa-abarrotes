## Requirements

- Java 17+
- Maven 3.8+
- MySQL

## Configuration

Before running the project, you must create the `src/main/resources/application.properties` file with the following structure (defaults shown on the right can be overridden through environment variables, which is how the Docker images inject their values):

```properties
spring.application.name=pwa-abarrotes

# Server configuration
server.port=${SERVER_PORT:82}

# Data Base Connection
db.host=${DB_HOST:localhost}
db.port=${DB_PORT:3306}
db.name=${DB_NAME:pwa_abarrotes}
db.username=${DB_USERNAME:root}
db.password=${DB_PASSWORD:}

# JPA
spring.jpa.hibernate.ddl-auto=${SPRING_JPA_HIBERNATE_DDL_AUTO:update}
spring.jpa.properties.hibernate.format_sql=${SPRING_JPA_FORMAT_SQL:true}
spring.jpa.show-sql=${SPRING_JPA_SHOW_SQL:true}

# Secret Key
jwt.secret=${JWT_SECRET:YOUR_SECRET_KEY_HERE}
```

> **Note:**  
> For the `jwt.secret` value, you must generate a secure 256-bit key.  
> You can easily generate one at:  
> [https://jwtsecrets.com/tools/encryption-key-generator](https://jwtsecrets.com/tools/encryption-key-generator)  
> Select **256 bits** and copy the generated key into the corresponding field.

## Running the Project

1. Clone the repository.
2. Create the database in MySQL with the name defined in `db.name`.
3. Configure the `application.properties` file as shown above.
4. Run the project with:

```sh
./mvnw spring-boot:run
```
or
```sh
mvn spring-boot:run
```

## Main Endpoints

- `/api/v1/auth/**` — Authentication endpoints (login, register, etc.)
- `/api/v1/demo/**` — Example protected endpoints

---
