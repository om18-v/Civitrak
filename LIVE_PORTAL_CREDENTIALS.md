# CiviTrak Local Portal Access

The project now uses a server-issued token for live local portal authentication.

## Authority
- Email: `sharma.chief@transport.gov.in`
- Password: `civitrak123`

## Contractor
- Email: `dispatch@apexhighway.com`
- Password: `civitrak123`

## Citizen
Citizen access does not require a municipal account. The public portal issues a short-lived citizen session token.

## Demo mode
Set `VITE_DEMO_MODE=true` in the frontend environment only when you intentionally want the seeded demo UI/mock dataset. Live mode is the default and uses backend/database APIs.

> These credentials are for local/SIH evaluation. Replace the seeded password and `CIVITRAK_AUTH_SECRET` before any real deployment.
