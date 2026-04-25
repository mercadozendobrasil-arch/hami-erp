# HAMI ERP

HAMI ERP 是面向 Shopee 巴西店铺运营的前后端一体化系统。

## 项目结构

```text
hami-erp/
├─ apps/
│  ├─ web/      # 前端 HAMI ERP UI
│  └─ api/      # 后端 Shopee Open Platform 服务
├─ package.json
└─ README.md
```

## 应用

- `apps/web`: 来自 `mercadozendobrasil-arch/shopee` 的 `main` 分支。
- `apps/api`: 来自 `mercadozendobrasil-arch/shopee-service` 的 `master` 分支。

## 常用命令

```bash
npm run dev:web
npm run dev:api
npm run build
npm run lint
```
