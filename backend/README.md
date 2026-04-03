# Backend (Single Config File + Env Injection)

All backend runtime configuration is now centralized in one file:
- src/main/resources/application.properties

This file uses system environment variable injection for database, auth, and runtime settings.

## Environment Variables
Set these directly in your system, shell, Docker, or deployment platform.

Common variables:
- DB_URL
- DB_USERNAME
- DB_PASSWORD
- SERVER_PORT
- DB_POOL_MAX_SIZE
- DB_POOL_MIN_IDLE
- DB_CONNECTION_TIMEOUT_MS
- JPA_DDL_AUTO
- JPA_SHOW_SQL
- CORS_ALLOWED_ORIGINS
- MYCOLLEGEMART_GOOGLE_CLIENT_ID
- JWT_SECRET (minimum 32 characters)
- JWT_EXPIRATION

## Run
Windows PowerShell:
1. Set environment variables
2. Run: .\mvnw.cmd spring-boot:run

## Notes
- Runtime database driver is PostgreSQL (org.postgresql:postgresql).
- Recommended production values:
	- JPA_DDL_AUTO=validate
	- JPA_SHOW_SQL=false
- If your existing database has users.is_prime_member null values, backfill before enforcing NOT NULL:
	- UPDATE users SET is_prime_member = FALSE WHERE is_prime_member IS NULL;
