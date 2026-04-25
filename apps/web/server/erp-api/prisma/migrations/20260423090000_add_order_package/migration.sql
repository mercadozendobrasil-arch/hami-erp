-- CreateTable
CREATE TABLE "erp_order_package" (
    "id" TEXT NOT NULL,
    "channel" "ChannelCode" NOT NULL DEFAULT 'SHOPEE',
    "site_code" TEXT NOT NULL DEFAULT 'BR',
    "shop_id" TEXT NOT NULL,
    "order_id" TEXT,
    "order_no" TEXT NOT NULL,
    "order_sn" TEXT NOT NULL,
    "package_number" TEXT NOT NULL,
    "tracking_number" TEXT,
    "package_status" TEXT,
    "package_fulfillment_status" TEXT,
    "logistics_status" TEXT,
    "shipping_carrier" TEXT,
    "logistics_channel_id" INTEGER,
    "logistics_channel_name" TEXT,
    "service_code" TEXT,
    "shipping_document_status" TEXT,
    "shipping_document_type" TEXT,
    "document_url" TEXT,
    "download_ref" JSONB,
    "logistics_profile" TEXT,
    "parcel_item_count" INTEGER NOT NULL DEFAULT 0,
    "latest_package_update_time" TIMESTAMPTZ(3),
    "last_document_sync_time" TIMESTAMPTZ(3),
    "raw_fragment" JSONB,
    "source_raw" JSONB,
    "last_sync_time" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "erp_order_package_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "erp_order_package_package_number_key" ON "erp_order_package"("package_number");

-- CreateIndex
CREATE INDEX "erp_order_package_channel_site_code_shop_id_idx" ON "erp_order_package"("channel", "site_code", "shop_id");

-- CreateIndex
CREATE INDEX "erp_order_package_shop_id_order_no_idx" ON "erp_order_package"("shop_id", "order_no");

-- CreateIndex
CREATE INDEX "erp_order_package_shop_id_order_sn_idx" ON "erp_order_package"("shop_id", "order_sn");

-- CreateIndex
CREATE INDEX "erp_order_package_order_id_idx" ON "erp_order_package"("order_id");

-- CreateIndex
CREATE INDEX "erp_order_package_logistics_status_idx" ON "erp_order_package"("logistics_status");

-- CreateIndex
CREATE INDEX "erp_order_package_logistics_channel_id_idx" ON "erp_order_package"("logistics_channel_id");

-- CreateIndex
CREATE INDEX "erp_order_package_shipping_document_status_idx" ON "erp_order_package"("shipping_document_status");

-- AddForeignKey
ALTER TABLE "erp_order_package" ADD CONSTRAINT "erp_order_package_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "channel_shop"("shop_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erp_order_package" ADD CONSTRAINT "erp_order_package_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "erp_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
