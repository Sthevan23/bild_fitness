-- =============================================================================
-- PEP Vendas — schema MySQL para Hostinger (phpMyAdmin)
-- =============================================================================
-- Como usar:
-- 1. No hPanel Hostinger → Bancos de dados MySQL → crie o banco (utf8mb4)
-- 2. Abra phpMyAdmin → selecione o banco criado
-- 3. Aba SQL → cole este arquivo (NÃO rode o CREATE DATABASE se o banco já existe)
-- 4. Configure no Node App:
--    DB_HOST=localhost
--    DB_PORT=3306
--    DB_USER=seu_usuario
--    DB_PASS=sua_senha
--    DB_NAME=nome_do_banco
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Se a Hostinger já criou o banco, ignore esta linha e use o banco selecionado:
-- CREATE DATABASE IF NOT EXISTS `pep_vendas` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `pep_vendas`;

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `companies` (
  `id`         VARCHAR(191) NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `logo_url`   VARCHAR(191) NULL,
  `theme`      VARCHAR(191) NOT NULL DEFAULT 'planilha',
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_accounts` (
  `id`         VARCHAR(191) NOT NULL,
  `company_id` VARCHAR(191) NOT NULL,
  `code`       VARCHAR(191) NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `cnpj`       VARCHAR(191) NULL,
  `active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_accounts_company_id_code_key` (`company_id`, `code`),
  KEY `sales_accounts_company_id_idx` (`company_id`),
  CONSTRAINT `sales_accounts_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `account_tax_rates` (
  `id`                     VARCHAR(191)   NOT NULL,
  `company_id`             VARCHAR(191)   NOT NULL,
  `account_id`             VARCHAR(191)   NOT NULL,
  `channel`                VARCHAR(191)   NOT NULL DEFAULT 'ML',
  `rate_percent`           DECIMAL(65,30) NOT NULL,
  `target_margin_percent`  DECIMAL(65,30) NOT NULL DEFAULT 15,
  `created_at`             DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`             DATETIME(3)    NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_tax_rates_account_id_channel_key` (`account_id`, `channel`),
  KEY `account_tax_rates_company_id_idx` (`company_id`),
  CONSTRAINT `account_tax_rates_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `account_tax_rates_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `sales_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `model_costs` (
  `id`          VARCHAR(191)   NOT NULL,
  `company_id`  VARCHAR(191)   NOT NULL,
  `model_code`  VARCHAR(191)   NOT NULL,
  `cost_per_kg` DECIMAL(65,30) NOT NULL,
  `supplier`    VARCHAR(191)   NULL,
  `created_at`  DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3)    NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `model_costs_company_id_model_code_key` (`company_id`, `model_code`),
  CONSTRAINT `model_costs_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id`             VARCHAR(191) NOT NULL,
  `company_id`     VARCHAR(191) NOT NULL,
  `name`           VARCHAR(191) NOT NULL,
  `email`          VARCHAR(191) NOT NULL,
  `password`       VARCHAR(191) NOT NULL,
  `role`           ENUM('ADMIN','FINANCEIRO','EXPEDICAO','ESTOQUE') NOT NULL DEFAULT 'ESTOQUE',
  `active`         TINYINT(1)   NOT NULL DEFAULT 1,
  `email_verified` DATETIME(3)  NULL,
  `image`          VARCHAR(191) NULL,
  `reset_token`    VARCHAR(191) NULL,
  `reset_expires`  DATETIME(3)  NULL,
  `created_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  KEY `users_company_id_idx` (`company_id`),
  CONSTRAINT `users_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `accounts` (
  `id`                   VARCHAR(191) NOT NULL,
  `user_id`              VARCHAR(191) NOT NULL,
  `type`                 VARCHAR(191) NOT NULL,
  `provider`             VARCHAR(191) NOT NULL,
  `provider_account_id`  VARCHAR(191) NOT NULL,
  `refresh_token`        TEXT NULL,
  `access_token`         TEXT NULL,
  `expires_at`           INT NULL,
  `token_type`           VARCHAR(191) NULL,
  `scope`                VARCHAR(191) NULL,
  `id_token`             TEXT NULL,
  `session_state`        VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_provider_provider_account_id_key` (`provider`, `provider_account_id`),
  KEY `accounts_user_id_fkey` (`user_id`),
  CONSTRAINT `accounts_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id`            VARCHAR(191) NOT NULL,
  `session_token` VARCHAR(191) NOT NULL,
  `user_id`       VARCHAR(191) NOT NULL,
  `expires`       DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_session_token_key` (`session_token`),
  KEY `sessions_user_id_fkey` (`user_id`),
  CONSTRAINT `sessions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `verification_tokens` (
  `identifier` VARCHAR(191) NOT NULL,
  `token`      VARCHAR(191) NOT NULL,
  `expires`    DATETIME(3)  NOT NULL,
  UNIQUE KEY `verification_tokens_token_key` (`token`),
  UNIQUE KEY `verification_tokens_identifier_token_key` (`identifier`, `token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id`         VARCHAR(191) NOT NULL,
  `company_id` VARCHAR(191) NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `phone`      VARCHAR(191) NULL,
  `email`      VARCHAR(191) NULL,
  `city`       VARCHAR(191) NULL,
  `cnpj`       VARCHAR(191) NULL,
  `notes`      VARCHAR(191) NULL,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `suppliers_company_id_idx` (`company_id`),
  CONSTRAINT `suppliers_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id`          VARCHAR(191) NOT NULL,
  `company_id`  VARCHAR(191) NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `phone`       VARCHAR(191) NULL,
  `document`    VARCHAR(191) NULL,
  `email`       VARCHAR(191) NULL,
  `address`     VARCHAR(191) NULL,
  `city`        VARCHAR(191) NULL,
  `state`       VARCHAR(191) NULL,
  `external_id` VARCHAR(191) NULL,
  `marketplace` VARCHAR(191) NULL,
  `created_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `customers_company_id_idx` (`company_id`),
  KEY `customers_company_id_external_id_idx` (`company_id`, `external_id`),
  CONSTRAINT `customers_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id`          VARCHAR(191)   NOT NULL,
  `company_id`  VARCHAR(191)   NOT NULL,
  `name`        VARCHAR(191)   NOT NULL,
  `sku`         VARCHAR(191)   NOT NULL,
  `barcode`     VARCHAR(191)   NULL,
  `category`    VARCHAR(191)   NULL,
  `unit`        VARCHAR(191)   NULL DEFAULT 'UN',
  `stock`       DECIMAL(65,30) NOT NULL DEFAULT 0,
  `min_stock`   DECIMAL(65,30) NOT NULL DEFAULT 5,
  `cost_price`  DECIMAL(65,30) NOT NULL DEFAULT 0,
  `avg_cost`    DECIMAL(65,30) NOT NULL DEFAULT 0,
  `sale_price`  DECIMAL(65,30) NOT NULL DEFAULT 0,
  `brand`       VARCHAR(191)   NULL,
  `linked_skus` VARCHAR(191)   NULL,
  `weight_kg`   DECIMAL(65,30) NULL,
  `model_code`  VARCHAR(191)   NULL,
  `image_url`   VARCHAR(191)   NULL,
  `ml_item_id`  VARCHAR(191)   NULL,
  `ml_status`   VARCHAR(191)   NULL,
  `supplier_id` VARCHAR(191)   NULL,
  `created_at`  DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3)    NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_company_id_sku_key` (`company_id`, `sku`),
  KEY `products_company_id_name_idx` (`company_id`, `name`),
  KEY `products_company_id_ml_item_id_idx` (`company_id`, `ml_item_id`),
  KEY `products_supplier_id_fkey` (`supplier_id`),
  CONSTRAINT `products_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `products_supplier_id_fkey`
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `account_stocks` (
  `id`         VARCHAR(191)   NOT NULL,
  `account_id` VARCHAR(191)   NOT NULL,
  `product_id` VARCHAR(191)   NOT NULL,
  `stock`      DECIMAL(65,30) NOT NULL DEFAULT 0,
  `min_stock`  DECIMAL(65,30) NOT NULL DEFAULT 5,
  `updated_at` DATETIME(3)    NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_stocks_account_id_product_id_key` (`account_id`, `product_id`),
  KEY `account_stocks_product_id_idx` (`product_id`),
  CONSTRAINT `account_stocks_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `sales_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `account_stocks_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_kit_components` (
  `id`                   VARCHAR(191)   NOT NULL,
  `kit_product_id`       VARCHAR(191)   NOT NULL,
  `component_product_id` VARCHAR(191)   NOT NULL,
  `quantity`             DECIMAL(65,30) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_kit_components_kit_component_key` (`kit_product_id`, `component_product_id`),
  KEY `product_kit_components_component_product_id_idx` (`component_product_id`),
  CONSTRAINT `product_kit_components_kit_product_id_fkey`
    FOREIGN KEY (`kit_product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_kit_components_component_product_id_fkey`
    FOREIGN KEY (`component_product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `marketplace_connections` (
  `id`                   VARCHAR(191) NOT NULL,
  `company_id`           VARCHAR(191) NOT NULL,
  `account_id`           VARCHAR(191) NULL,
  `marketplace`          ENUM('MERCADO_LIVRE','SHOPEE','AMAZON','MAGALU','NUVEMSHOP') NOT NULL,
  `seller_id`            VARCHAR(191) NULL,
  `nickname`             VARCHAR(191) NULL,
  `account_name`         VARCHAR(191) NULL,
  `access_token_enc`     TEXT         NOT NULL,
  `refresh_token_enc`    TEXT         NOT NULL,
  `expires_at`           DATETIME(3)  NOT NULL,
  `status`               ENUM('CONNECTED','DISCONNECTED','ERROR','EXPIRED') NOT NULL DEFAULT 'DISCONNECTED',
  `last_sync_at`         DATETIME(3)  NULL,
  `last_sync_error`      VARCHAR(191) NULL,
  `last_orders_sync_at`  DATETIME(3)  NULL,
  `scope`                VARCHAR(191) NULL,
  `created_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`           DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `marketplace_connections_company_marketplace_account_key` (`company_id`, `marketplace`, `account_id`),
  KEY `marketplace_connections_marketplace_status_idx` (`marketplace`, `status`),
  KEY `marketplace_connections_account_id_fkey` (`account_id`),
  CONSTRAINT `marketplace_connections_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `marketplace_connections_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `sales_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id`              VARCHAR(191)   NOT NULL,
  `company_id`      VARCHAR(191)   NOT NULL,
  `account_id`      VARCHAR(191)   NULL,
  `number`          VARCHAR(191)   NOT NULL,
  `customer_id`     VARCHAR(191)   NULL,
  `platform`        ENUM('MERCADO_LIVRE','SHOPEE','WHATSAPP','LOJA') NOT NULL,
  `status`          ENUM('AGUARDANDO','SEPARANDO','ENVIADO','ENTREGUE','CANCELADO') NOT NULL DEFAULT 'AGUARDANDO',
  `payment_method`  VARCHAR(191)   NULL,
  `tracking_code`   VARCHAR(191)   NULL,
  `total`           DECIMAL(65,30) NOT NULL DEFAULT 0,
  `freight`         DECIMAL(65,30) NOT NULL DEFAULT 0,
  `marketplace_fee` DECIMAL(65,30) NOT NULL DEFAULT 0,
  `net_amount`      DECIMAL(65,30) NOT NULL DEFAULT 0,
  `external_id`     VARCHAR(191)   NULL,
  `shipping_id`     VARCHAR(191)   NULL,
  `stock_deducted`  TINYINT(1)     NOT NULL DEFAULT 0,
  `notes`           VARCHAR(191)   NULL,
  `ordered_at`      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `shipped_at`      DATETIME(3)    NULL,
  `created_at`      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3)    NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_company_id_number_key` (`company_id`, `number`),
  UNIQUE KEY `orders_company_id_external_id_key` (`company_id`, `external_id`),
  KEY `orders_company_id_status_ordered_at_idx` (`company_id`, `status`, `ordered_at`),
  KEY `orders_account_id_ordered_at_idx` (`account_id`, `ordered_at`),
  KEY `orders_customer_id_fkey` (`customer_id`),
  CONSTRAINT `orders_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orders_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `sales_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_customer_id_fkey`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id`             VARCHAR(191)   NOT NULL,
  `order_id`       VARCHAR(191)   NOT NULL,
  `product_id`     VARCHAR(191)   NOT NULL,
  `quantity`       DECIMAL(65,30) NOT NULL,
  `unit_price`     DECIMAL(65,30) NOT NULL,
  `total_price`    DECIMAL(65,30) NOT NULL,
  `product_cost`   DECIMAL(65,30) NOT NULL DEFAULT 0,
  `tax_amount`     DECIMAL(65,30) NOT NULL DEFAULT 0,
  `gross_profit`   DECIMAL(65,30) NOT NULL DEFAULT 0,
  `margin_percent` DECIMAL(65,30) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `order_items_order_id_fkey` (`order_id`),
  KEY `order_items_product_id_fkey` (`product_id`),
  CONSTRAINT `order_items_order_id_fkey`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_items_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `nfe_imports` (
  `id`             VARCHAR(191)   NOT NULL,
  `company_id`     VARCHAR(191)   NOT NULL,
  `user_id`        VARCHAR(191)   NOT NULL,
  `access_key`     VARCHAR(191)   NOT NULL,
  `total_items`    INT            NOT NULL,
  `items_updated`  INT            NOT NULL,
  `items_created`  INT            NOT NULL,
  `total_value`    DECIMAL(65,30) NOT NULL,
  `status`         ENUM('PENDING','CONFIRMED','CANCELLED','FAILED') NOT NULL DEFAULT 'PENDING',
  `created_at`     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nfe_imports_company_id_access_key_key` (`company_id`, `access_key`),
  KEY `nfe_imports_user_id_fkey` (`user_id`),
  CONSTRAINT `nfe_imports_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `nfe_imports_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id`          VARCHAR(191)   NOT NULL,
  `company_id`  VARCHAR(191)   NOT NULL,
  `number`      VARCHAR(191)   NOT NULL,
  `series`      VARCHAR(191)   NOT NULL,
  `access_key`  VARCHAR(191)   NOT NULL,
  `supplier_id` VARCHAR(191)   NULL,
  `total_value` DECIMAL(65,30) NOT NULL,
  `tax_value`   DECIMAL(65,30) NULL,
  `freight`     DECIMAL(65,30) NULL,
  `discount`    DECIMAL(65,30) NULL,
  `issued_at`   DATETIME(3)    NOT NULL,
  `imported_at` DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `import_id`   VARCHAR(191)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_access_key_key` (`access_key`),
  KEY `invoices_company_id_idx` (`company_id`),
  KEY `invoices_supplier_id_fkey` (`supplier_id`),
  KEY `invoices_import_id_fkey` (`import_id`),
  CONSTRAINT `invoices_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `invoices_supplier_id_fkey`
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_import_id_fkey`
    FOREIGN KEY (`import_id`) REFERENCES `nfe_imports` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id`         VARCHAR(191)   NOT NULL,
  `company_id` VARCHAR(191)   NOT NULL,
  `account_id` VARCHAR(191)   NULL,
  `product_id` VARCHAR(191)   NOT NULL,
  `type`       ENUM('ENTRADA','SAIDA') NOT NULL,
  `quantity`   DECIMAL(65,30) NOT NULL,
  `unit_cost`  DECIMAL(65,30) NOT NULL DEFAULT 0,
  `total_cost` DECIMAL(65,30) NOT NULL DEFAULT 0,
  `note`       VARCHAR(191)   NULL,
  `order_id`   VARCHAR(191)   NULL,
  `invoice_id` VARCHAR(191)   NULL,
  `user_id`    VARCHAR(191)   NULL,
  `created_at` DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `stock_movements_company_id_created_at_idx` (`company_id`, `created_at`),
  KEY `stock_movements_account_id_created_at_idx` (`account_id`, `created_at`),
  KEY `stock_movements_product_id_fkey` (`product_id`),
  KEY `stock_movements_order_id_fkey` (`order_id`),
  KEY `stock_movements_invoice_id_fkey` (`invoice_id`),
  KEY `stock_movements_user_id_fkey` (`user_id`),
  CONSTRAINT `stock_movements_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `sales_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_order_id_fkey`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_invoice_id_fkey`
    FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `finance_entries` (
  `id`          VARCHAR(191)   NOT NULL,
  `company_id`  VARCHAR(191)   NOT NULL,
  `type`        ENUM('ENTRADA','SAIDA') NOT NULL,
  `status`      ENUM('PENDENTE','PAGO','RECEBIDO','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
  `description` VARCHAR(191)   NOT NULL,
  `amount`      DECIMAL(65,30) NOT NULL,
  `due_date`    DATETIME(3)    NULL,
  `paid_at`     DATETIME(3)    NULL,
  `category`    VARCHAR(191)   NULL,
  `order_id`    VARCHAR(191)   NULL,
  `created_at`  DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3)    NOT NULL,
  PRIMARY KEY (`id`),
  KEY `finance_entries_company_id_type_due_date_idx` (`company_id`, `type`, `due_date`),
  KEY `finance_entries_order_id_fkey` (`order_id`),
  CONSTRAINT `finance_entries_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `finance_entries_order_id_fkey`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ml_sale_raws` (
  `id`                VARCHAR(191)   NOT NULL,
  `company_id`        VARCHAR(191)   NOT NULL,
  `account_id`        VARCHAR(191)   NULL,
  `external_sale_id`  VARCHAR(191)   NOT NULL,
  `sold_at`           DATETIME(3)    NULL,
  `sku`               VARCHAR(191)   NULL,
  `title`             VARCHAR(191)   NULL,
  `units`             DECIMAL(65,30) NOT NULL DEFAULT 1,
  `revenue_products`  DECIMAL(65,30) NOT NULL DEFAULT 0,
  `fees`              DECIMAL(65,30) NOT NULL DEFAULT 0,
  `shipping_revenue`  DECIMAL(65,30) NOT NULL DEFAULT 0,
  `shipping_fees`     DECIMAL(65,30) NOT NULL DEFAULT 0,
  `total`             DECIMAL(65,30) NOT NULL DEFAULT 0,
  `buyer_name`        VARCHAR(191)   NULL,
  `status`            VARCHAR(191)   NULL,
  `ml_item_id`        VARCHAR(191)   NULL,
  `raw_json`          TEXT           NULL,
  `import_batch_id`   VARCHAR(191)   NULL,
  `created_at`        DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ml_sale_raws_company_id_external_sale_id_key` (`company_id`, `external_sale_id`),
  KEY `ml_sale_raws_company_id_sold_at_idx` (`company_id`, `sold_at`),
  KEY `ml_sale_raws_account_id_sold_at_idx` (`account_id`, `sold_at`),
  CONSTRAINT `ml_sale_raws_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ml_sale_raws_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `sales_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_deliveries` (
  `id`            VARCHAR(191) NOT NULL,
  `company_id`    VARCHAR(191) NOT NULL,
  `account_id`    VARCHAR(191) NOT NULL,
  `supplier_name` VARCHAR(191) NULL,
  `status`        ENUM('PEDIDO','ENTREGA') NOT NULL DEFAULT 'PEDIDO',
  `ordered_at`    DATETIME(3)  NULL,
  `delivered_at`  DATETIME(3)  NULL,
  `notes`         VARCHAR(191) NULL,
  `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)  NOT NULL,
  `stock_applied` TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `purchase_deliveries_company_id_account_id_idx` (`company_id`, `account_id`),
  KEY `purchase_deliveries_account_id_fkey` (`account_id`),
  CONSTRAINT `purchase_deliveries_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `purchase_deliveries_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `sales_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_delivery_lines` (
  `id`          VARCHAR(191)   NOT NULL,
  `delivery_id` VARCHAR(191)   NOT NULL,
  `product_id`  VARCHAR(191)   NULL,
  `description` VARCHAR(191)   NOT NULL,
  `quantity`    DECIMAL(65,30) NOT NULL DEFAULT 0,
  `unit_cost`   DECIMAL(65,30) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `purchase_delivery_lines_delivery_id_fkey` (`delivery_id`),
  KEY `purchase_delivery_lines_product_id_fkey` (`product_id`),
  CONSTRAINT `purchase_delivery_lines_delivery_id_fkey`
    FOREIGN KEY (`delivery_id`) REFERENCES `purchase_deliveries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `purchase_delivery_lines_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spreadsheet_imports` (
  `id`                   VARCHAR(191) NOT NULL,
  `company_id`           VARCHAR(191) NOT NULL,
  `file_name`            VARCHAR(191) NOT NULL,
  `status`               ENUM('PENDING','CONFIRMED','CANCELLED','FAILED') NOT NULL DEFAULT 'PENDING',
  `products_upserted`    INT          NOT NULL DEFAULT 0,
  `sales_imported`       INT          NOT NULL DEFAULT 0,
  `stock_updated`        INT          NOT NULL DEFAULT 0,
  `deliveries_imported`  INT          NOT NULL DEFAULT 0,
  `finance_imported`     INT          NOT NULL DEFAULT 0,
  `message`              VARCHAR(191) NULL,
  `created_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `spreadsheet_imports_company_id_created_at_idx` (`company_id`, `created_at`),
  CONSTRAINT `spreadsheet_imports_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cost_allocations` (
  `id`            VARCHAR(191)   NOT NULL,
  `company_id`    VARCHAR(191)   NOT NULL,
  `month_label`   VARCHAR(191)   NOT NULL,
  `category`      VARCHAR(191)   NOT NULL,
  `description`   VARCHAR(191)   NOT NULL,
  `amount`        DECIMAL(65,30) NOT NULL DEFAULT 0,
  `rate_pcp`      DECIMAL(65,30) NOT NULL DEFAULT 0,
  `rate_rc`       DECIMAL(65,30) NOT NULL DEFAULT 0,
  `rate_pp`       DECIMAL(65,30) NOT NULL DEFAULT 0,
  `allocated_pcp` DECIMAL(65,30) NOT NULL DEFAULT 0,
  `allocated_rc`  DECIMAL(65,30) NOT NULL DEFAULT 0,
  `allocated_pp`  DECIMAL(65,30) NOT NULL DEFAULT 0,
  `created_at`    DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)    NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cost_allocations_company_month_description_key` (`company_id`, `month_label`, `description`),
  KEY `cost_allocations_company_id_month_label_idx` (`company_id`, `month_label`),
  CONSTRAINT `cost_allocations_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Seed inicial (empresa + admin + contas P&P / RC / PCP)
-- Senha: admin123  (bcrypt)
-- =============================================================================

INSERT INTO `companies` (`id`, `name`, `theme`, `created_at`, `updated_at`)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Bild Fitness',
  'planilha',
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `users` (
  `id`, `company_id`, `name`, `email`, `password`, `role`, `active`, `created_at`, `updated_at`
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Administrador',
  'admin@bildfitness.local',
  '$2b$10$q5s5IGVTtsBBuQCGZcJsJORNNPEtYO.dDFLwbZNnHRRmgvK5Cb3Xm',
  'ADMIN',
  1,
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE
  `password` = VALUES(`password`),
  `active` = 1,
  `role` = 'ADMIN';

INSERT INTO `sales_accounts` (`id`, `company_id`, `code`, `name`, `active`, `created_at`, `updated_at`) VALUES
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'P&P', 'P&P', 1, NOW(3), NOW(3)),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'RC',  'RC',  1, NOW(3), NOW(3)),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'PCP', 'PCP', 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `active` = 1, `name` = VALUES(`name`);
