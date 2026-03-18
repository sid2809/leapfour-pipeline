-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "search_query" TEXT NOT NULL,
    "serp_keyword" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state_region" TEXT,
    "lead_target" INTEGER NOT NULL,
    "overscrape_mult" DECIMAL(65,30) NOT NULL DEFAULT 2.5,
    "is_test" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "export_status" JSONB NOT NULL DEFAULT '{}',
    "outscraper_id" TEXT,
    "outscraper_raw" JSONB,
    "total_scraped" INTEGER NOT NULL DEFAULT 0,
    "total_filtered" INTEGER NOT NULL DEFAULT 0,
    "total_parked" INTEGER NOT NULL DEFAULT 0,
    "total_enriched" INTEGER NOT NULL DEFAULT 0,
    "total_failed" INTEGER NOT NULL DEFAULT 0,
    "pipeline_started_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCRAPED',
    "business_name" TEXT,
    "business_name_raw" TEXT,
    "contact_name" TEXT,
    "first_name" TEXT,
    "email" TEXT,
    "email_2" TEXT,
    "email_3" TEXT,
    "email_type" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "website_raw" TEXT,
    "website_display" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "google_rating" DECIMAL(2,1),
    "review_count" INTEGER,
    "reviews_per_score" JSONB,
    "business_hours" JSONB,
    "business_category" TEXT,
    "is_verified" BOOLEAN,
    "google_maps_url" TEXT,
    "google_place_id" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "linkedin_url" TEXT,
    "pagespeed_score" INTEGER,
    "pagespeed_mobile" TEXT,
    "pagespeed_lcp" DECIMAL(65,30),
    "pagespeed_inp" DECIMAL(65,30),
    "pagespeed_cls" DECIMAL(65,30),
    "pagespeed_load_time" DECIMAL(65,30),
    "pagespeed_issues" JSONB,
    "pagespeed_fetched_at" TIMESTAMP(3),
    "in_local_pack" BOOLEAN,
    "local_pack_position" INTEGER,
    "local_pack_exists" BOOLEAN,
    "search_query_used" TEXT,
    "search_location" TEXT,
    "competitor_1_name" TEXT,
    "competitor_1_rating" DECIMAL(65,30),
    "competitor_1_reviews" INTEGER,
    "competitor_2_name" TEXT,
    "competitor_2_rating" DECIMAL(65,30),
    "competitor_2_reviews" INTEGER,
    "competitor_3_name" TEXT,
    "competitor_3_rating" DECIMAL(65,30),
    "competitor_3_reviews" INTEGER,
    "has_paid_ads" BOOLEAN,
    "serp_fetched_at" TIMESTAMP(3),
    "batch_avg_rating" DECIMAL(65,30),
    "batch_avg_reviews" INTEGER,
    "batch_rank" INTEGER,
    "category" TEXT,
    "score_invisible" DECIMAL(65,30),
    "score_reviews" DECIMAL(65,30),
    "score_slowsite" DECIMAL(65,30),
    "score_nowebsite" DECIMAL(65,30),
    "score_strongnoads" DECIMAL(65,30),
    "exported_at" TIMESTAMP(3),
    "instantly_campaign" TEXT,
    "error_message" TEXT,
    "error_step" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "last_error_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serp_cache" (
    "id" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "local_pack" JSONB,
    "paid_results" JSONB,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serp_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_logs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "leads_campaign_id_status_idx" ON "leads"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "leads_campaign_id_category_idx" ON "leads"("campaign_id", "category");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_google_place_id_idx" ON "leads"("google_place_id");

-- CreateIndex
CREATE INDEX "templates_category_sequence_number_idx" ON "templates"("category", "sequence_number");

-- CreateIndex
CREATE UNIQUE INDEX "templates_category_sequence_number_key" ON "templates"("category", "sequence_number");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "serp_cache_cache_key_key" ON "serp_cache"("cache_key");

-- CreateIndex
CREATE INDEX "serp_cache_cache_key_expires_at_idx" ON "serp_cache"("cache_key", "expires_at");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
