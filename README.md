# shopee-service

`shopee-service` 是一个基于 `Node.js + TypeScript + NestJS` 的 Shopee 集成服务项目骨架。当前阶段只完成基础工程初始化，不包含完整 Shopee 业务实现。

## 当前范围

- NestJS 基础入口与健康检查
- PostgreSQL + Prisma 基础接入结构
- Redis + BullMQ 基础接入结构
- Swagger 文档初始化
- Docker / docker-compose 本地开发骨架
- Prisma 基础模型占位

## 技术栈

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Redis
- BullMQ
- Prisma
- Swagger
- Docker

## 目录结构

```text
.
|-- src
|   |-- app.controller.ts
|   |-- app.module.ts
|   |-- app.service.ts
|   `-- infra
|       `-- database
|-- prisma
|   `-- schema.prisma
|-- test
|-- docker-compose.yml
|-- Dockerfile
`-- .env.example
```

## 环境变量

复制环境变量模板并按需修改：

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## 本地开发

```bash
npm install
npm run prisma:generate
npm run start:dev
```

Swagger 默认地址：

- `http://localhost:3000/docs`

健康检查：

- `GET /api/health`

## Docker 开发

```bash
docker compose up --build
```

## Prisma 基础模型说明

当前只创建了项目初始骨架需要的基础模型：

- `ShopeeShop`
- `ShopeeToken`
- `JobRecord`
- `WebhookEvent`

这些模型用于承接后续店铺授权、令牌生命周期、异步任务和 webhook 处理，但本阶段不实现完整业务逻辑。

## 下一步建议

- 增加配置模块与环境变量校验
- 补充 Prisma migration
- 引入日志、异常过滤器和统一响应结构
- 按业务边界逐步创建 Shopee 授权、商品、订单、物流等模块
