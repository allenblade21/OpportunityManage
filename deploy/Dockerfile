# 机汇 · 容器化部署(构建 + Nginx 托管,适用于 BytePlus 容器服务 / 任意 K8s / Docker 主机)
# 用法(在仓库根目录执行):
#   docker build -f deploy/Dockerfile -t jihui-opportunity-manage .
#   docker run -d -p 80:80 jihui-opportunity-manage

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
