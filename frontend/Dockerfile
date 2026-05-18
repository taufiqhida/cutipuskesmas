# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install deps with yarn (per project convention)
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install

# Build args supaya REACT_APP_BACKEND_URL bisa di-inject saat build
ARG REACT_APP_BACKEND_URL=http://localhost:8001
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

COPY . .
RUN yarn build

# ---------- Runtime stage (nginx) ----------
FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
