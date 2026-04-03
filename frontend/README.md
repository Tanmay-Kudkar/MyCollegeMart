# MyCollegeMart Frontend

## Environment Variables

Frontend no longer needs Google client ID or client secret for authentication.

- Google OAuth is started from backend endpoint: /api/auth/google/start
- Configure Google OAuth only in backend environment variables.

Recommended frontend variable:

- VITE_API_URL=https://your-backend-domain/api