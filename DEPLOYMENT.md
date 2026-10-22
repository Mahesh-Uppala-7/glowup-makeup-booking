# Deploying GlowUp (free) 🚀

This guide takes you from local code → **GitHub** → **live on the internet** using
[Render](https://render.com)'s free tier. No credit card needed for the free plan.

Everything deploys from one file: [`render.yaml`](render.yaml) (database + API + web app).

---

## Part A — Push the code to GitHub

> Already done locally: the repo is initialised and the first commit is made.

1. Go to **https://github.com/new** (sign in / create a free account first).
2. **Repository name:** `glowup-makeup-booking` (anything is fine).
3. Keep it **Public** (or Private). **Do NOT** tick "Add a README / .gitignore / license" — the repo must start empty.
4. Click **Create repository**. GitHub shows a URL like
   `https://github.com/<your-username>/glowup-makeup-booking.git`.
5. Back in VS Code's terminal (in the project folder), run these two commands
   (replace the URL with yours):

   ```powershell
   git remote add origin https://github.com/<your-username>/glowup-makeup-booking.git
   git push -u origin main
   ```

6. A browser window opens asking you to sign in to GitHub — approve it. Your code is now on GitHub. ✅

> From now on, to publish changes: `git add .` → `git commit -m "your message"` → `git push`.

---

## Part B — Deploy on Render (database + API + web app)

1. Go to **https://render.com** → **Get Started** → **Sign in with GitHub** (easiest).
2. Authorize Render to access your GitHub repositories.
3. In the Render Dashboard, click **New +** → **Blueprint**.
4. Select your `glowup-makeup-booking` repository → Render auto-detects [`render.yaml`](render.yaml).
5. Give the blueprint a name and click **Apply**.
6. Render now creates three things automatically:
   - **glowup-db** — PostgreSQL database
   - **glowup-api** — the backend API (builds, creates tables, seeds demo data)
   - **glowup-web** — the web app (static site)
7. Wait for all three to show **Live** (first build takes a few minutes).

Your app is now online at:

```
https://glowup-web.onrender.com        ← the app (open this!)
https://glowup-api.onrender.com/health ← API health check
```

(The exact subdomain may have a suffix if the name was taken — use whatever Render shows.)

### Log in on the live site
Enter any 10-digit number (e.g. `9876543210`). Because `OTP_DEV_MODE` is on, the
6-digit code appears right on the verify screen — no SMS needed.

---

## Important notes (free tier)

- **Cold starts:** the free API **sleeps after ~15 min** of inactivity. The first request
  then takes ~50 seconds to wake up. This is normal on the free plan.
- **Free database expiry:** Render's free PostgreSQL is removed after **30 days**. For a
  longer-lived DB, create a free database on **[Neon](https://neon.tech)** and paste its
  connection string into the `glowup-api` service's `DATABASE_URL` env var (Dashboard →
  glowup-api → Environment), then remove the `databases:` block from `render.yaml`.
- **Custom domain:** free subdomains are `*.onrender.com`. To use your own domain, add it
  under the service's **Settings → Custom Domains** (you need to own a domain).

---

## Going to real production later

- **SMS OTP:** set `SMS_PROVIDER=twilio` (or `msg91`) + credentials, and `OTP_DEV_MODE=false`
  in the `glowup-api` environment.
- **Payments:** add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`, and set
  `EXPO_PUBLIC_RAZORPAY_KEY_ID` on `glowup-web`.
- **Tighter CORS:** replace `CORS_ORIGINS=*` with your web app URL.
- **Mobile apps (iOS/Android):** build with **EAS** (`npx eas build`) — needs a free Expo
  account. The same codebase powers web, iOS and Android.
