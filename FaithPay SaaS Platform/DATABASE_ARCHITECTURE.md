# FaithPay Database Architecture

## 📚 현재 구조 (KV Store)

FaithPay는 현재 **Supabase KV Store**를 사용하여 데이터를 저장합니다.

### 키 네이밍 규칙

```
tenant:{id}                              → 단체 기본정보
tenant:slug:{slug}                       → slug → id 매핑
payment:{tenantId}                       → 결제 설정
donation-items:{tenantId}                → 봉헌 항목 목록
donation:{tenantId}:{timestamp}-{id}     → 개별 봉헌 내역
admin:{email}                            → 관리자 정보
admin:id:{id}                            → id → email 매핑
stats:{tenantId}:{year}-{month}          → 월별 통계
```

### 데이터 구조

모든 데이터는 JSON 형태로 저장됩니다:

```typescript
// 예시: tenant:1
{
  id: "1",
  slug: "joyful-church",
  name: "기쁨의교회",
  religionType: "protestant",
  primaryColor: "#1976d2",
  // ... 기타 필드
  createdAt: "2026-03-28T12:00:00Z",
  updatedAt: "2026-03-28T12:00:00Z"
}
```

---

## 🔄 PostgreSQL 마이그레이션 가이드

나중에 PostgreSQL로 전환하려면 다음 단계를 따르세요.

### 1단계: 테이블 스키마 정의

```sql
-- 단체 테이블
CREATE TABLE tenants (
  id VARCHAR(50) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  religion_type VARCHAR(20) NOT NULL CHECK (religion_type IN ('protestant', 'buddhist', 'catholic')),
  primary_color VARCHAR(7) NOT NULL,
  logo_url TEXT,
  banner_images JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  address TEXT NOT NULL,
  contact JSONB NOT NULL,
  schedule JSONB DEFAULT '[]'::jsonb,
  terminology JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_religion_type ON tenants(religion_type);

-- 결제 설정 테이블
CREATE TABLE payment_configs (
  tenant_id VARCHAR(50) PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  pg_provider VARCHAR(50) NOT NULL,
  api_key TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  mid VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 봉헌 항목 테이블
CREATE TABLE donation_items (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  amount_type VARCHAR(20) NOT NULL CHECK (amount_type IN ('fixed', 'flexible')),
  fixed_amount INTEGER,
  allow_recurring BOOLEAN DEFAULT true,
  allow_one_time BOOLEAN DEFAULT true,
  enable_prayer_field BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_donation_items_tenant ON donation_items(tenant_id);

-- 봉헌 내역 테이블
CREATE TABLE donations (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id VARCHAR(50) NOT NULL REFERENCES donation_items(id),
  item_name VARCHAR(100) NOT NULL,
  amount INTEGER NOT NULL,
  donor_name VARCHAR(100) NOT NULL,
  donor_phone VARCHAR(20) NOT NULL,
  prayer_text TEXT,
  family_members JSONB,
  baptism_name VARCHAR(100),
  is_recurring BOOLEAN DEFAULT false,
  recurring_day INTEGER,
  payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_donations_tenant ON donations(tenant_id);
CREATE INDEX idx_donations_created_at ON donations(created_at);
CREATE INDEX idx_donations_status ON donations(payment_status);

-- 관리자 테이블
CREATE TABLE admins (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(200) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('system_admin', 'tenant_admin', 'finance_manager', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_tenant ON admins(tenant_id);

-- 통계 테이블 (materialized view로 대체 가능)
CREATE TABLE monthly_stats (
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_amount BIGINT NOT NULL,
  total_count INTEGER NOT NULL,
  by_type JSONB DEFAULT '{}'::jsonb,
  by_payment_method JSONB DEFAULT '{}'::jsonb,
  recurring_amount BIGINT DEFAULT 0,
  recurring_count INTEGER DEFAULT 0,
  one_time_amount BIGINT DEFAULT 0,
  one_time_count INTEGER DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (tenant_id, year, month)
);

CREATE INDEX idx_monthly_stats_date ON monthly_stats(year, month);
```

### 2단계: 데이터 마이그레이션 스크립트

```typescript
// migrate-to-postgres.ts
import * as kv from './kv_store';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: Deno.env.get('DATABASE_URL'),
});

async function migrateKVToPostgres() {
  console.log('🔄 Starting migration from KV to PostgreSQL...');

  // 1. Migrate Tenants
  const tenants = await kv.getByPrefix('tenant:');
  for (const tenant of tenants.filter((t: any) => t.id)) {
    await pool.query(
      `INSERT INTO tenants (id, slug, name, religion_type, primary_color, logo_url, 
        banner_images, description, address, contact, schedule, terminology, 
        created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
      [
        tenant.id,
        tenant.slug,
        tenant.name,
        tenant.religionType,
        tenant.primaryColor,
        tenant.logoUrl,
        JSON.stringify(tenant.bannerImages),
        tenant.description,
        tenant.address,
        JSON.stringify(tenant.contact),
        JSON.stringify(tenant.schedule),
        JSON.stringify(tenant.terminology),
        tenant.createdAt,
        tenant.updatedAt,
      ]
    );
    console.log(`  ✓ Migrated tenant: ${tenant.name}`);
  }

  // 2. Migrate Payment Configs
  const payments = await kv.getByPrefix('payment:');
  for (const config of payments) {
    await pool.query(
      `INSERT INTO payment_configs (tenant_id, pg_provider, api_key, secret_key, mid, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id) DO UPDATE SET 
         pg_provider = $2, api_key = $3, secret_key = $4, mid = $5, 
         is_active = $6, updated_at = $7`,
      [
        config.tenantId,
        config.pgProvider,
        config.apiKey,
        config.secretKey,
        config.mid,
        config.isActive,
        config.updatedAt,
      ]
    );
  }

  // 3. Migrate Donation Items
  const donationItemsData = await kv.getByPrefix('donation-items:');
  for (const items of donationItemsData) {
    for (const item of items) {
      await pool.query(
        `INSERT INTO donation_items (id, tenant_id, name, description, amount_type, 
          fixed_amount, allow_recurring, allow_one_time, enable_prayer_field, enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          item.id,
          item.tenantId,
          item.name,
          item.description,
          item.amountType,
          item.fixedAmount,
          item.allowRecurring,
          item.allowOneTime,
          item.enablePrayerField,
          item.enabled,
        ]
      );
    }
  }

  // 4. Migrate Donations
  const donations = await kv.getByPrefix('donation:');
  for (const donation of donations) {
    await pool.query(
      `INSERT INTO donations (id, tenant_id, item_id, item_name, amount, donor_name, 
        donor_phone, prayer_text, family_members, baptism_name, is_recurring, 
        recurring_day, payment_status, payment_method, transaction_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (id) DO NOTHING`,
      [
        donation.id,
        donation.tenantId,
        donation.itemId,
        donation.itemName,
        donation.amount,
        donation.donorName,
        donation.donorPhone,
        donation.prayerText,
        donation.familyMembers ? JSON.stringify(donation.familyMembers) : null,
        donation.baptismName,
        donation.isRecurring,
        donation.recurringDay,
        donation.paymentStatus,
        donation.paymentMethod,
        donation.transactionId,
        donation.createdAt,
        donation.updatedAt,
      ]
    );
  }

  // 5. Migrate Admins
  const admins = await kv.getByPrefix('admin:');
  for (const admin of admins.filter((a: any) => a.email)) {
    await pool.query(
      `INSERT INTO admins (id, email, password, name, tenant_id, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        admin.id,
        admin.email,
        admin.password,
        admin.name,
        admin.tenantId,
        admin.role,
        admin.createdAt,
        admin.updatedAt,
      ]
    );
  }

  console.log('✅ Migration completed successfully!');
  await pool.end();
}
```

### 3단계: Database Adapter 교체

`/supabase/functions/server/database.tsx` 파일에서 KV 함수들을 PostgreSQL 쿼리로 교체:

```typescript
// Before (KV)
export async function getTenantById(id: string): Promise<Tenant | null> {
  return await kv.get(`tenant:${id}`);
}

// After (PostgreSQL)
export async function getTenantById(id: string): Promise<Tenant | null> {
  const result = await pool.query(
    'SELECT * FROM tenants WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}
```

### 4단계: 인덱스 최적화

```sql
-- 자주 조회되는 필드에 인덱스 추가
CREATE INDEX idx_donations_tenant_date ON donations(tenant_id, created_at DESC);
CREATE INDEX idx_donations_recurring ON donations(tenant_id, is_recurring) WHERE is_recurring = true;

-- Full-text search (검색 기능용)
CREATE INDEX idx_donations_donor_search ON donations USING gin(to_tsvector('korean', donor_name));
```

---

## 🎯 마이그레이션 장점

### PostgreSQL 전환 후 얻는 이점:

1. **복잡한 쿼리** - JOIN, GROUP BY, 집계 함수 사용 가능
2. **데이터 일관성** - Foreign Key 제약 조건
3. **트랜잭션** - ACID 보장
4. **성능** - 인덱스, 쿼리 최적화
5. **백업/복구** - PostgreSQL의 강력한 백업 도구
6. **확장성** - 대용량 데이터 처리

### 현재 KV Store의 장점:

1. ✅ **즉시 사용 가능** - 설정 불필요
2. ✅ **빠른 프로토타이핑**
3. ✅ **단순한 구조**
4. ✅ **낮은 학습 곡선**

---

## 📊 비교

| 기능 | KV Store | PostgreSQL |
|------|----------|------------|
| 설정 복잡도 | ⭐ 매우 쉬움 | ⭐⭐⭐ 복잡 |
| 쿼리 능력 | ⭐⭐ 제한적 | ⭐⭐⭐⭐⭐ 강력 |
| 성능 (단순 조회) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 성능 (복잡 쿼리) | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 데이터 일관성 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 확장성 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🚀 권장 사항

- **현재 단계 (프로토타입/MVP)**: KV Store 사용 ✅
- **베타/출시 준비**: PostgreSQL로 마이그레이션 고려
- **대규모 운영**: PostgreSQL 필수

데이터 구조가 PostgreSQL 스키마를 고려하여 설계되어 있으므로, 언제든지 쉽게 전환 가능합니다!
