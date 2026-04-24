-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ChannelCode" AS ENUM ('SHOPEE');

-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('AUTHORIZED', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "channel_shop" (
    "id" TEXT NOT NULL,
    "channel" "ChannelCode" NOT NULL DEFAULT 'SHOPEE',
    "site_code" TEXT NOT NULL DEFAULT 'BR',
    "shop_id" TEXT NOT NULL,
    "shop_name" TEXT NOT NULL,
    "status" "ShopStatus" NOT NULL DEFAULT 'AUTHORIZED',
    "raw_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "channel_shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_token" (
    "id" TEXT NOT NULL,
    "channel" "ChannelCode" NOT NULL DEFAULT 'SHOPEE',
    "shop_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expire_at" TIMESTAMPTZ(3) NOT NULL,
    "raw_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "channel_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erp_product" (
    "id" TEXT NOT NULL,
    "channel" "ChannelCode" NOT NULL DEFAULT 'SHOPEE',
    "site_code" TEXT NOT NULL DEFAULT 'BR',
    "shop_id" TEXT NOT NULL,
    "platform_product_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(18,2) NOT NULL,
    "raw_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "erp_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erp_order" (
    "id" TEXT NOT NULL,
    "channel" "ChannelCode" NOT NULL DEFAULT 'SHOPEE',
    "site_code" TEXT NOT NULL DEFAULT 'BR',
    "shop_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "order_status" TEXT NOT NULL,
    "buyer_name" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "total_amount" DECIMAL(18,2) NOT NULL,
    "created_at_remote" TIMESTAMPTZ(3),
    "raw_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "erp_order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_shop_shop_id_key" ON "channel_shop"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_token_shop_id_key" ON "channel_token"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "erp_product_shop_id_platform_product_id_key" ON "erp_product"("shop_id", "platform_product_id");

-- CreateIndex
CREATE INDEX "erp_product_channel_site_code_shop_id_idx" ON "erp_product"("channel", "site_code", "shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "erp_order_order_no_key" ON "erp_order"("order_no");

-- CreateIndex
CREATE INDEX "erp_order_channel_site_code_shop_id_idx" ON "erp_order"("channel", "site_code", "shop_id");

-- AddForeignKey
ALTER TABLE "channel_token" ADD CONSTRAINT "channel_token_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "channel_shop"("shop_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erp_product" ADD CONSTRAINT "erp_product_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "channel_shop"("shop_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erp_order" ADD CONSTRAINT "erp_order_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "channel_shop"("shop_id") ON DELETE CASCADE ON UPDATE CASCADE;
