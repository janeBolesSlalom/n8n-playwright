# n8n-heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://dashboard.heroku.com/new?template=https://github.com/n8n-io/n8n-heroku/tree/main)

## n8n - Free and open fair-code licensed node based Workflow Automation Tool.

This repository provides two ways to run n8n:

- **Locally for development** (with PostgreSQL support)
- **On Heroku** (easy cloud deployment)

---

## 🖥️ Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [PostgreSQL](https://www.postgresql.org/) (install via [Homebrew](https://brew.sh/) on Mac: `brew install postgresql`)

---

### 1. Clone the repository

```sh
git clone <your-repo-url>
cd n8n-heroku
```

---

### 2. Install dependencies

```sh
npm install
```

---

### 3. Set up PostgreSQL

Start PostgreSQL (if not already running):

```sh
brew services start postgresql
```

Create a database and user if needed:

```sh
createdb n8n
# Optionally, create a user and set a password:
# createuser user --pwprompt
# psql -c "ALTER USER user WITH PASSWORD 'password';"
```

---

### 4. Configure environment variables

Edit `dev_exports` (create this file if it doesn't exist):

```bash
export DATABASE_URL="postgres://user:password@localhost:5432/n8n"
export PORT=5678
export NODE_FUNCTION_ALLOW_EXTERNAL=playwright
```

Replace `user` and `password` with your actual PostgreSQL credentials if different.

---

### 5. Start n8n

In your terminal, run:

```sh
./entrypoint.sh
```

n8n should now start on [http://localhost:5678](http://localhost:5678).

---

### Troubleshooting

- **Database errors:** Make sure PostgreSQL is running and your credentials are correct.

---

### Notes

- This setup is for local development only.
- For production, use secure credentials and follow n8n’s [deployment best practices](https://docs.n8n.io/hosting/).

---

---

## 🐳 Local Development with Docker Compose

This project supports running n8n (with Playwright and PostgreSQL) using Docker Compose.  
This is the recommended way to get started quickly, as it handles all dependencies for you.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your machine.

---

### 1. Clone the repository

```sh
git clone <your-repo-url>
cd n8n-heroku
```

---

### 2. Build and start the containers

```sh
docker-compose build
docker-compose up
```

This will:
- Build a custom n8n image with Playwright support.
- Start both n8n and PostgreSQL containers.

---

### 3. Access n8n

Once started, n8n will be available at [http://localhost:5678](http://localhost:5678).

- Default basic auth credentials (if enabled in `docker-compose.yml`):  
  **Username:** `admin`  
  **Password:** `admin`

---

### 4. Stopping the containers

Press `Ctrl+C` in the terminal, or run:

```sh
docker-compose down
```

---

### 5. Troubleshooting

- **Database connection errors:**  
  Make sure both containers are running. The `n8n` service is configured to connect to the `postgres` service automatically.
- **Playwright errors:**  
  The Docker image is set up to support Playwright in n8n Code nodes. If you see browser errors, ensure the image built successfully and you are using the correct Code node syntax.

---

### Notes

- All data in PostgreSQL is persisted in a Docker volume (`postgres_data`).
- You can customize environment variables in `docker-compose.yml` as needed.
- For production, review n8n’s [deployment best practices](https://docs.n8n.io/hosting/).

---

## 🚀 Deploy to Heroku

Use the **Deploy to Heroku** button above to launch n8n on Heroku.  
When deploying, make sure to check all configuration options and adjust them to your needs.  
It's especially important to set `N8N_ENCRYPTION_KEY` to a random secure value.

Refer to the [Heroku n8n tutorial](https://docs.n8n.io/hosting/server-setups/heroku/) for more information.

If you have questions after trying the tutorials, check out the [forums](https://community.n8n.io/).

---