-- =============================================
-- 极速兔礼品卡后台 - 数据库建表 SQL
-- 数据库: Supabase (PostgreSQL)
-- =============================================

-- 1. 分类表（支持无限层级，用 parent_id 实现）
CREATE TABLE categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  parent_id   UUID REFERENCES categories(id) ON DELETE CASCADE,
  sort_order  INT DEFAULT 0,
  icon        VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 礼品卡表
CREATE TABLE cards (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  country_code    VARCHAR(10),
  currency        VARCHAR(10),
  source_country  VARCHAR(10),
  source_currency VARCHAR(10),
  icon_url        VARCHAR(500),
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 面值表（每张卡对应多个面值）
CREATE TABLE card_denominations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id     UUID REFERENCES cards(id) ON DELETE CASCADE,
  amount      DECIMAL(10,2) NOT NULL,
  currency    VARCHAR(10) NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 汇率配置表
CREATE TABLE exchange_rates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id         UUID REFERENCES cards(id) ON DELETE CASCADE,
  from_currency   VARCHAR(10) NOT NULL,
  to_currency     VARCHAR(10) NOT NULL,
  rate            DECIMAL(18,6) NOT NULL,
  is_hidden       BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 操作日志表（安全审计）
CREATE TABLE operation_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  action      VARCHAR(100) NOT NULL,  -- 如 'UPDATE_RATE', 'DELETE_CARD'
  table_name  VARCHAR(50),
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 初始数据
-- =============================================

-- 插入顶级分类
INSERT INTO categories (name, sort_order, icon) VALUES
  ('快速礼品卡', 1, 'bolt'),
  ('超市礼品卡', 2, 'building-store'),
  ('签证礼品卡', 3, 'credit-card'),
  ('APP支付',    4, 'device-mobile'),
  ('数字货币',   5, 'currency-bitcoin'),
  ('银行电汇',   6, 'building-bank');

-- 插入示例礼品卡（归属于"快速礼品卡"分类）
INSERT INTO cards (name, category_id, country_code, currency, source_country, source_currency)
SELECT '雷蛇黄金 · Razer Gold', id, 'NG', 'NGN', 'US', 'USD'
FROM categories WHERE name = '快速礼品卡';

-- =============================================
-- Row Level Security (RLS) 安全策略
-- =============================================

-- 开启 RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- 只有已登录用户才能读写（后台系统）
CREATE POLICY "auth_users_only" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "auth_users_only" ON cards
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "auth_users_only" ON card_denominations
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "auth_users_only" ON exchange_rates
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "auth_users_only" ON operation_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 自动更新 updated_at 触发器
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categories_updated
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cards_updated
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
