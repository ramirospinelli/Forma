-- Dynamic HR Zones & Load Integrity Migration

-- 1. Enhance activity_metrics with Model Metadata
ALTER TABLE activity_metrics 
ADD COLUMN IF NOT EXISTS zone_model_type TEXT DEFAULT 'STATIC',
ADD COLUMN IF NOT EXISTS zone_model_version INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS zone_snapshot JSONB;

-- 2. Enhance daily_load_profile with Engine Status
ALTER TABLE daily_load_profile
ADD COLUMN IF NOT EXISTS engine_status JSONB;

-- 3. Comment for documentation
COMMENT ON COLUMN activity_metrics.zone_snapshot IS 'Stores the HR zone thresholds {z1: max, z2: max...} used at calculation time';
COMMENT ON COLUMN activity_metrics.zone_model_type IS 'Source of zones: LTHR_FRIEL, HRMAX_AGE, or STATIC';
