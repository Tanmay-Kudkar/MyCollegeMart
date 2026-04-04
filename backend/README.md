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
- MYCOLLEGEMART_GOOGLE_CLIENT_SECRET
- MYCOLLEGEMART_GOOGLE_REDIRECT_URI (optional; if omitted, backend auto-derives from request host)
- FRONTEND_BASE_URL
- JWT_SECRET (minimum 32 characters)
- JWT_EXPIRATION
- APP_ADMIN_EMAILS (comma-separated admin emails)
- APP_MASTER_EMAIL (single master account email)
- APP_MASTER_PASSWORD (master account password)
- RAZORPAY_KEY_ID (required for online checkout)
- RAZORPAY_KEY_SECRET (required for online checkout)

Master login notes:
- When APP_MASTER_EMAIL and APP_MASTER_PASSWORD are set, backend bootstraps a master user with full access (admin + listing + skill service creation).
- Use frontend login portal "Master" for this account.

## Run
Windows PowerShell:
1. Set environment variables
2. Run: .\mvnw.cmd spring-boot:run

## Notes
- Runtime database driver is PostgreSQL (org.postgresql:postgresql).
- Checkout is backend-driven via:
	- POST /api/checkout/create-order
	- POST /api/checkout/verify-payment
	- POST /api/checkout/place-cod
	- GET /api/orders/my
- Wishlist is persisted per authenticated user via:
	- GET /api/wishlist
	- POST /api/wishlist/{productId}
	- DELETE /api/wishlist/{productId}
	- POST /api/wishlist/sync
- Recommended production values:
	- JPA_DDL_AUTO=validate
	- JPA_SHOW_SQL=false
- If your existing database has users.is_prime_member null values, backfill before enforcing NOT NULL:
	- UPDATE users SET is_prime_member = FALSE WHERE is_prime_member IS NULL;
