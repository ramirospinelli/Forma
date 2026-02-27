-- ACWR and Performance Intelligence Migration

-- 1. Bio-Performance Profile fields in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg FLOAT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lthr INT; -- Lactate Threshold Heart Rate
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT; -- 'male', 'female', 'other'

-- 2. Table for user-specific performance thresholds
CREATE TABLE IF NOT EXISTS user_thresholds (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  threshold_pace FLOAT DEFAULT 270, -- seconds per km (4:30/km)
  threshold_power FLOAT DEFAULT 250, -- watts
  ftp FLOAT DEFAULT 250, -- watts
  hr_zones JSONB, -- Stores custom zones [{zone: 1, min: X, max: Y}, ...]
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize thresholds for existing users
INSERT INTO user_thresholds (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- 3. Load tracking enhancements
ALTER TABLE daily_load_profile ADD COLUMN IF NOT EXISTS acwr FLOAT;

-- 4. Activity metrics enhancements
ALTER TABLE activity_metrics ADD COLUMN IF NOT EXISTS intensity_factor FLOAT;
ALTER TABLE activity_metrics ADD COLUMN IF NOT EXISTS aerobic_efficiency FLOAT;

-- 5. Create a view for easy ACWR trend analysis
CREATE OR REPLACE VIEW health_metrics AS
SELECT 
  user_id,
  date,
  ctl,
  atl,
  acwr,
  CASE 
    WHEN acwr < 0.8 THEN 'Detraining'
    WHEN acwr <= 1.3 THEN 'Optimal'
    WHEN acwr <= 1.5 THEN 'Caution'
    ELSE 'High Risk'
  END as risk_status
FROM daily_load_profile;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_load_user_date ON daily_load_profile(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, start_date_local DESC);
