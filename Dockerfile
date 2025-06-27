FROM node:20-bullseye

RUN apt-get update && apt-get install -y \
    git \
    python3 \
    build-essential \
    wget \
    ca-certificates \
    fonts-freefont-ttf \
    libnss3 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libasound2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libxshmfence1 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node

# Install n8n and Playwright
RUN npm install -g n8n playwright && npx playwright install --with-deps

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]