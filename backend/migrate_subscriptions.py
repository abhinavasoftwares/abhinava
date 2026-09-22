import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not found in .env")

print("Connecting to Cloud SQL...")

sql = """
BEGIN;

DELETE FROM client_subscription_modules;

DELETE FROM client_subscriptions;

DELETE FROM subscription_plan_modules;

DELETE FROM subscription_plan_prices;

DELETE FROM subscription_plans;

ALTER TABLE client_subscriptions
    DROP COLUMN IF EXISTS city_tier_id;

ALTER TABLE client_subscriptions
    DROP COLUMN IF EXISTS turnover_band_id;

DROP TABLE IF EXISTS subscription_plan_prices;

DROP TABLE IF EXISTS city_tiers;

DROP TABLE IF EXISTS turnover_bands;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(12,2)
    NOT NULL DEFAULT 0;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS annual_price NUMERIC(12,2)
    NOT NULL DEFAULT 0;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3)
    NOT NULL DEFAULT 'INR';

ALTER TABLE subscription_plans
    DROP CONSTRAINT IF EXISTS
    ck_subscription_plans_monthly_price_nonnegative;

ALTER TABLE subscription_plans
    ADD CONSTRAINT
    ck_subscription_plans_monthly_price_nonnegative
    CHECK (monthly_price >= 0);

ALTER TABLE subscription_plans
    DROP CONSTRAINT IF EXISTS
    ck_subscription_plans_annual_price_nonnegative;

ALTER TABLE subscription_plans
    ADD CONSTRAINT
    ck_subscription_plans_annual_price_nonnegative
    CHECK (annual_price >= 0);

COMMIT;
"""

try:
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql+psycopg://",
        "postgresql://"
    )
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)

    print()
    print("=" * 60)
    print("SUCCESS")
    print("Cloud SQL subscription structure updated successfully.")
    print("=" * 60)

except Exception as e:
    print()
    print("=" * 60)
    print("FAILED")
    print("=" * 60)
    print(str(e))
    print("=" * 60)
    raise