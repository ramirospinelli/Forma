-- Optimization for Performance-Grade Visualization
-- Aggregation and Windowing Support

-- 1. Index for fast time-series retrieval per user
CREATE INDEX IF NOT EXISTS idx_daily_load_user_date ON daily_load_profile (user_id, date DESC);

-- 2. Index for Weekly Summaries
CREATE INDEX IF NOT EXISTS idx_weekly_load_user_date ON weekly_load_metrics (user_id, week_start_date DESC);

-- 3. Composite index for activity metrics lookups (used in ZonalDistribution)
-- This helps when joining activities and activity_metrics for large datasets
CREATE INDEX IF NOT EXISTS idx_activity_metrics_composite ON activity_metrics (activity_id);

-- 4. View for Monthly Trends (Server-side aggregation for long-term scaling)
-- This allows the app to fetch 12 months in 12 rows instead of 365.
CREATE OR REPLACE VIEW monthly_load_summary AS
SELECT 
    user_id,
    date_trunc('month', date::date) as month,
    avg(ctl) as avg_fitness,
    max(atl) as peak_fatigue,
    avg(tsb) as avg_form,
    sum(daily_trimp) as total_monthly_trimp
FROM daily_load_profile
GROUP BY user_id, month;
