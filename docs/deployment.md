# HAMI ERP Deployment

This project is deployed as a frontend static site plus a local NestJS API behind Nginx.

## Production domains

DNS should point these records to the server IP:

- `hamimih.com`
- `www.hamimih.com`
- `staging.hamimih.com`

Recommended public URLs:

- Frontend: `https://hamimih.com`
- API through reverse proxy: `https://hamimih.com/api/*`

The frontend should keep calling relative API paths such as:

```txt
/api/shopee/shops
/api/shopee/auth/authorize-url
/api/shopee/auth/callback
```

Do not hard-code `localhost`, the server IP, or an API domain inside browser-facing frontend code.

## Backend environment

On the server, configure `apps/api/.env` with values similar to:

```env
NODE_ENV=production
PORT=3001
API_PREFIX=api
SWAGGER_PATH=docs

SHOPEE_ENV=sandbox
SHOPEE_SANDBOX_BASE_URL=https://partner.test-stable.shopeemobile.com
SHOPEE_SANDBOX_PARTNER_ID=123456
SHOPEE_SANDBOX_PARTNER_KEY=replace_me
SHOPEE_SANDBOX_REDIRECT_URL=https://hamimih.com/shop/auth

SHOPEE_PROD_BASE_URL=https://partner.shopeemobile.com
SHOPEE_PROD_PARTNER_ID=123456
SHOPEE_PROD_PARTNER_KEY=replace_me
SHOPEE_PROD_REDIRECT_URL=https://hamimih.com/shop/auth
```

`SHOPEE_*_PARTNER_ID` must be a numeric uint32 integer string. Do not use placeholders such as `your_partner_id` in a real `.env` file.

## Frontend environment

`apps/web/.env.example` is only for local development proxy configuration.

For production, the recommended setup is:

- frontend calls `/api/*`
- Nginx proxies `/api/*` to `http://127.0.0.1:3001/api/*`

## Nginx

A ready-to-use HTTP config is provided at:

```txt
deploy/nginx/hamimih.com.conf
```

Install it on the server:

```bash
sudo cp deploy/nginx/hamimih.com.conf /etc/nginx/sites-available/hamimih.com
sudo ln -sf /etc/nginx/sites-available/hamimih.com /etc/nginx/sites-enabled/hamimih.com
sudo nginx -t
sudo systemctl reload nginx
```

If another default site conflicts, disable it:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## Build and run

From the repository root:

```bash
npm install
npm --workspace apps/api run build
npm --workspace apps/web run build
```

Run the API with your process manager. Example with PM2:

```bash
pm2 start apps/api/dist/main.js --name hami-erp-api
pm2 save
```

The frontend build should be available at:

```txt
apps/web/dist
```

If your deployment path is different, update the `root` directive in `deploy/nginx/hamimih.com.conf`.

## Verification

After deployment, check:

```bash
curl -I https://hamimih.com
curl -I https://hamimih.com/api/shopee/shops
```

Expected behavior:

| Result | Meaning |
|---|---|
| `200` with `[]` or shop data | API proxy is working |
| `404` | Nginx route or backend route mismatch |
| `502` | API is not running or not listening on `127.0.0.1:3001` |
| Cloudflare `521/522` | server firewall, Nginx, or origin connectivity problem |

## Cloudflare

When Cloudflare proxy is enabled, the server should expose ports:

- `80`
- `443` if HTTPS is terminated at Nginx

The API port `3001` does not need to be public. It should be reachable locally by Nginx only.
