# Auth Testing Playbook

## Credentials
- Admin: admin@kebun.id / admin123 (seeded on startup)

## API smoke test
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@kebun.id","password":"admin123"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
```
Login returns user object + sets httpOnly `access_token` cookie. `/me` returns same user via cookie.

## Notes
- JWT in httpOnly cookie `access_token`, 12h expiry. Also accepts `Authorization: Bearer`.
- Protected endpoints: all /api/records* require auth.
