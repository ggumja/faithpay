/**
 * Database Seeder
 * 
 * 초기 Mock 데이터를 KV 스토어에 저장합니다.
 * 이 파일은 서버 시작 시 한 번 실행되어야 합니다.
 */

import * as db from './database.tsx';
import * as kv from './kv_store.tsx';

export async function seedDatabase() {
  console.log('🌱 Starting database seed...');
  
  try {
    // ==================== ADMINS ====================
    console.log('📝 Seeding admins...');
    
    const admins = [
      {
        id: 'system_admin',
        email: 'admin@faithpay.com',
        password: 'admin123', // 실제로는 해시해야 함
        name: '시스템 관리자',
        tenantId: 'system',
        role: 'system_admin' as const,
      },
      {
        id: 'admin1',
        email: 'admin@joyful-church.org',
        password: 'admin123',
        name: '김목사',
        tenantId: '1',
        role: 'tenant_admin' as const,
      },
      {
        id: 'admin2',
        email: 'admin@serenity-temple.org',
        password: 'admin123',
        name: '혜민스님',
        tenantId: '2',
        role: 'tenant_admin' as const,
      },
      {
        id: 'admin3',
        email: 'admin@grace-cathedral.org',
        password: 'admin123',
        name: '베드로신부',
        tenantId: '3',
        role: 'tenant_admin' as const,
      },
      {
        id: 'finance1',
        email: 'finance@joyful-church.org',
        password: 'finance123',
        name: '이집사',
        tenantId: '1',
        role: 'finance_manager' as const,
      },
    ];
    
    for (const admin of admins) {
      const existing = await db.getAdminByEmail(admin.email);
      if (!existing) {
        await db.createAdmin(admin);
        console.log(`  ✓ Created admin: ${admin.email}`);
      }
    }
    
    // ==================== TENANTS ====================
    console.log('📝 Seeding tenants...');
    
    const tenants = [
      {
        id: '1',
        slug: 'joyful-church',
        name: '기쁨의교회',
        religionType: 'protestant' as const,
        primaryColor: '#1976d2',
        logoUrl: 'https://images.unsplash.com/photo-1620495137036-fccf4af581bf?w=200',
        bannerImages: [
          'https://images.unsplash.com/photo-1772878490426-e1c25eff4dba?w=1200',
          'https://images.unsplash.com/photo-1620495137036-fccf4af581bf?w=1200',
        ],
        description: '예수 그리스도의 사랑과 은혜를 경험하고 나누는 교회입니다. 모든 사람이 환영받고, 하나님의 말씀으로 성장하며, 서로 사랑하는 공동체를 만들어갑니다.',
        address: '서울특별시 강남구 테헤란로 123',
        contact: {
          phone: '02-1234-5678',
          email: 'info@joyful-church.org',
          name: '김목사',
        },
        schedule: [
          { label: '주일 1부 예배', time: '오전 9:00' },
          { label: '주일 2부 예배', time: '오전 11:00' },
          { label: '수요예배', time: '오후 7:30' },
          { label: '금요기도회', time: '오후 7:30' },
        ],
        terminology: { donation: '헌금', member: '성도', prayer: '기도제목' },
        status: 'active' as const,
        approvedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '2',
        slug: 'serenity-temple',
        name: '평화사찰',
        religionType: 'buddhist' as const,
        primaryColor: '#ff6f00',
        logoUrl: 'https://images.unsplash.com/photo-1770149682823-0befb39aa86e?w=200',
        bannerImages: [
          'https://images.unsplash.com/photo-1573285702030-f7952e595655?w=1200',
          'https://images.unsplash.com/photo-1770149682823-0befb39aa86e?w=1200',
        ],
        description: '부처님의 자비와 지혜로 평화와 행복을 찾는 도량입니다. 참선과 수행을 통해 마음의 평안을 얻고, 자비와 나눔의 실천으로 세상에 빛을 전합니다.',
        address: '서울특별시 종로구 인사동길 45',
        contact: {
          phone: '02-2345-6789',
          email: 'info@serenity-temple.org',
          name: '혜민스님',
        },
        schedule: [
          { label: '새벽예불', time: '오전 5:30' },
          { label: '일요법회', time: '오전 10:00' },
          { label: '수요법회', time: '오후 7:00' },
          { label: '참선수행', time: '매주 토요일 오후 2:00' },
        ],
        terminology: { donation: '보시', member: '불자', prayer: '발원문' },
        status: 'active' as const,
        approvedAt: '2026-01-15T00:00:00Z',
      },
      {
        id: '3',
        slug: 'grace-cathedral',
        name: '은혜성당',
        religionType: 'catholic' as const,
        primaryColor: '#7b1fa2',
        logoUrl: 'https://images.unsplash.com/photo-1761316945926-51b6c682c190?w=200',
        bannerImages: [
          'https://images.unsplash.com/photo-1623351151870-302b4199cee3?w=1200',
          'https://images.unsplash.com/photo-1761316945926-51b6c682c190?w=1200',
        ],
        description: '하느님의 사랑과 은총 안에서 신앙을 키우고 실천하는 본당입니다. 성찬의 신비를 체험하고, 이웃 사랑을 실천하며, 복음의 기쁨을 전하는 공동체입니다.',
        address: '서울특별시 중구 명동길 74',
        contact: {
          phone: '02-3456-7890',
          email: 'info@grace-cathedral.org',
          name: '베드로신부',
        },
        schedule: [
          { label: '주일미사', time: '오전 9:00, 11:00, 오후 5:00' },
          { label: '평일미사', time: '오전 6:30, 오후 7:00' },
          { label: '토요미사', time: '오후 6:00' },
          { label: '고해성사', time: '매주 토요일 오후 4:00-5:30' },
        ],
        terminology: { donation: '봉헌', member: '교우', prayer: '미사지향' },
        status: 'active' as const,
        approvedAt: '2026-02-01T00:00:00Z',
      },
      // ─── 승인 대기 샘플 ──────────────────────────────────
      {
        id: 'pending-yonggungsa',
        slug: 'yonggungsa',
        name: '해동용궁사',
        religionType: 'buddhist' as const,
        primaryColor: '#0288d1',
        logoUrl: 'https://images.unsplash.com/photo-1604537372136-89b3dae196e3?w=200',
        bannerImages: [
          'https://images.unsplash.com/photo-1604537372136-89b3dae196e3?w=1200',
        ],
        description: '부산 기장군 해안에 위치한 해동용궁사는 바다와 맞닿은 아름다운 사찰로, 관음보살의 영험한 기도처로 유명합니다.',
        address: '부산광역시 기장군 기장읍 용궁길 86',
        contact: {
          phone: '010-8765-4321',
          email: 'info@yonggungsa.org',
          name: '용궁사 총무팀',
        },
        schedule: [
          { label: '새벽예불', time: '오전 4:00' },
          { label: '일요법회', time: '오전 10:30' },
          { label: '관음기도회', time: '매월 1일, 15일 오전 10:00' },
        ],
        terminology: { donation: '보시', member: '불자', prayer: '발원문' },
        status: 'pending' as const,
        appliedAt: '2026-03-29T09:00:00Z',
      },
    ];
    
    for (const tenant of tenants) {
      const existing = await db.getTenantById(tenant.id);
      if (!existing) {
        await db.createTenant(tenant);
        console.log(`  ✓ Created tenant: ${tenant.name} [${tenant.status}]`);
      }
    }
    
    // ==================== DONATION ITEMS ====================
    console.log('📝 Seeding donation items...');
    
    const donationItemsByTenant = {
      '1': [
        {
          id: '1',
          tenantId: '1',
          name: '십일조',
          description: '수입의 1/10을 드리는 정기 헌금입니다.',
          amountType: 'flexible' as const,
          allowRecurring: true,
          allowOneTime: true,
          enablePrayerField: true,
          enabled: true,
        },
        {
          id: '2',
          tenantId: '1',
          name: '감사헌금',
          description: '하나님의 은혜에 감사드리는 헌금입니다.',
          amountType: 'flexible' as const,
          allowRecurring: false,
          allowOneTime: true,
          enablePrayerField: true,
          enabled: true,
        },
        {
          id: '3',
          tenantId: '1',
          name: '건축헌금',
          description: '교회 건물 신축을 위한 특별헌금입니다.',
          amountType: 'flexible' as const,
          allowRecurring: true,
          allowOneTime: true,
          enablePrayerField: false,
          enabled: true,
        },
      ],
      '2': [
        {
          id: '1',
          tenantId: '2',
          name: '인등보시',
          description: '법당 인등을 켜는 보시입니다.',
          amountType: 'fixed' as const,
          fixedAmount: 30000,
          allowRecurring: false,
          allowOneTime: true,
          enablePrayerField: true,
          enabled: true,
        },
        {
          id: '2',
          tenantId: '2',
          name: '불사공양',
          description: '사찰 불사를 위한 공양입니다.',
          amountType: 'flexible' as const,
          allowRecurring: true,
          allowOneTime: true,
          enablePrayerField: true,
          enabled: true,
        },
        {
          id: '3',
          tenantId: '2',
          name: '기도보시',
          description: '기도 정성을 담은 보시입니다.',
          amountType: 'flexible' as const,
          allowRecurring: false,
          allowOneTime: true,
          enablePrayerField: true,
          enabled: true,
        },
      ],
      '3': [
        {
          id: '1',
          tenantId: '3',
          name: '교무금',
          description: '본당 운영을 위한 정기 봉헌입니다.',
          amountType: 'flexible' as const,
          allowRecurring: true,
          allowOneTime: true,
          enablePrayerField: false,
          enabled: true,
        },
        {
          id: '2',
          tenantId: '3',
          name: '미사예물',
          description: '미사 지향을 위한 예물입니다.',
          amountType: 'fixed' as const,
          fixedAmount: 10000,
          allowRecurring: false,
          allowOneTime: true,
          enablePrayerField: true,
          enabled: true,
        },
        {
          id: '3',
          tenantId: '3',
          name: '특별봉헌',
          description: '특별한 의향을 위한 봉헌입니다.',
          amountType: 'flexible' as const,
          allowRecurring: false,
          allowOneTime: true,
          enablePrayerField: true,
          enabled: true,
        },
      ],
    };
    
    for (const [tenantId, items] of Object.entries(donationItemsByTenant)) {
      const existing = await db.getDonationItems(tenantId);
      if (existing.length === 0) {
        await db.setDonationItems(tenantId, items);
        console.log(`  ✓ Created donation items for tenant ${tenantId}`);
      }
    }
    
    // ==================== SAMPLE DONATIONS ====================
    console.log('📝 Seeding sample donations...');
    
    const sampleDonations = [
      {
        id: 'don-1',
        tenantId: '1',
        itemId: '1',
        itemName: '십일조',
        amount: 100000,
        donorName: '김성도',
        donorPhone: '010-1234-5678',
        prayerText: '가정의 평안을 위해 기도합니다',
        isRecurring: true,
        recurringDay: 10,
        paymentStatus: 'completed' as const,
        paymentMethod: 'card',
        transactionId: 'TXN-001',
      },
      {
        id: 'don-2',
        tenantId: '1',
        itemId: '2',
        itemName: '감사헌금',
        amount: 50000,
        donorName: '이집사',
        donorPhone: '010-2345-6789',
        prayerText: '승진의 은혜에 감사드립니다',
        isRecurring: false,
        paymentStatus: 'completed' as const,
        paymentMethod: 'transfer',
        transactionId: 'TXN-002',
      },
      {
        id: 'don-3',
        tenantId: '2',
        itemId: '1',
        itemName: '인등보시',
        amount: 30000,
        donorName: '박불자',
        donorPhone: '010-3456-7890',
        prayerText: '가족의 건강을 발원합니다',
        isRecurring: false,
        paymentStatus: 'completed' as const,
        paymentMethod: 'card',
        transactionId: 'TXN-003',
      },
      {
        id: 'don-4',
        tenantId: '3',
        itemId: '1',
        itemName: '교무금',
        amount: 80000,
        donorName: '최교우',
        baptismName: '베드로',
        donorPhone: '010-4567-8901',
        isRecurring: true,
        recurringDay: 1,
        paymentStatus: 'completed' as const,
        paymentMethod: 'card',
        transactionId: 'TXN-004',
      },
    ];
    
    for (const donation of sampleDonations) {
      const existing = await db.getDonationById(donation.tenantId, donation.id);
      if (!existing) {
        await db.createDonation(donation);
        console.log(`  ✓ Created donation: ${donation.id}`);
      }
    }
    
    // ==================== SAMPLE PARTNERS ====================
    console.log('📝 Seeding sample partners...');

    const partners: db.Partner[] = [
      // ── 대리점 (master_agency)
      //    대리점 수수료: 채널풀(1%)의 30% → 실효 0.30%
      //    대형 대리점일수록 오버라이드율 낮음 (영업자에 더 많이 배분)
      {
        id: 'partner-001',
        name: '한국종교솔루션(주)',
        email: 'ceo@kr-solution.co.kr',
        phone: '02-3456-7890',
        role: 'master_agency',
        commissionRate: 0.5,
        agencyRate: 0.5,      // 대리점 고정율 0.5% (결제금액의 0.5%)
        referralCode: 'KRS2024',
        bankName: '신한은행',
        accountNumber: '100-032-456789',
        accountHolder: '한국종교솔루션',
        status: 'active',
        createdAt: '2024-01-15T09:00:00.000Z',
      },
      {
        id: 'partner-002',
        name: '불교정보화협의회',
        email: 'info@buddhist-it.kr',
        phone: '02-567-8901',
        role: 'master_agency',
        commissionRate: 0.5,
        agencyRate: 0.5,      // 대리점 고정율 0.5%
        referralCode: 'BIT2024',
        bankName: '국민은행',
        accountNumber: '620-21-0123456',
        accountHolder: '불교정보화협의회',
        status: 'active',
        createdAt: '2024-03-10T09:00:00.000Z',
      },
      // ── 영업자 (sales_agent)
      //    실효율 = 고객 계약율 − PG 1.5% − 플랫폼 0.5% − 대리점 agencyRate
      //    더 높은 계약율로 유치할수록 영업자가 더 많이 가져감 (인센티브 구조)
      {
        id: 'partner-003',
        name: '김정수',
        email: 'jskim@faithsales.kr',
        phone: '010-1234-5678',
        role: 'sales_agent',
        parentId: 'partner-001',
        commissionRate: 0,    // 파생값 — 실효율은 계약에 따라 다름
        agencyRate: 0,
        referralCode: 'KJS001',
        bankName: '하나은행',
        accountNumber: '123-456789-01234',
        accountHolder: '김정수',
        status: 'active',
        createdAt: '2024-02-05T09:00:00.000Z',
      },
      {
        id: 'partner-004',
        name: '이수진',
        email: 'sjlee@temple-pay.kr',
        phone: '010-2345-6789',
        role: 'sales_agent',
        parentId: 'partner-002',
        commissionRate: 0,
        agencyRate: 0,
        referralCode: 'LSJ002',
        bankName: '우리은행',
        accountNumber: '1002-123-456789',
        accountHolder: '이수진',
        status: 'active',
        createdAt: '2024-04-20T09:00:00.000Z',
      },
      {
        id: 'partner-005',
        name: '박민호',
        email: 'mhpark@church-biz.kr',
        phone: '010-3456-7890',
        role: 'sales_agent',
        parentId: 'partner-001',
        commissionRate: 0,
        agencyRate: 0,
        referralCode: 'PMH003',
        bankName: '기업은행',
        accountNumber: '032-123456-01-012',
        accountHolder: '박민호',
        status: 'pending',
        createdAt: '2024-06-01T09:00:00.000Z',
      },
    ];

    for (const partner of partners) {
      // 요율 변경 반영을 위해 항상 덮어씀
      await kv.set(`partner:${partner.id}`, partner);
      const label = partner.role === 'master_agency'
        ? `대리점 고정율 ${partner.agencyRate}%`
        : '영업자 (계약에 따라 실효율 변동)';
      console.log(`  ✓ Upserted partner: ${partner.name} (${label})`);
    }

    // ── 수수료 이력 ────────────────────────────────────────────────
    // 대리점 고정율: KRS/BIT = 0.5%
    // 영업자 실효율 = contractRate − 1.5%(PG) − 0.5%(플랫폼) − 0.5%(대리점)
    //
    // 예시)
    //   3.0% 계약: 영업자 0.5%  / 대리점 0.5% — 표준
    //   3.5% 계약: 영업자 1.0%  / 대리점 0.5% — +0.5% 인센티브
    //   4.0% 계약: 영업자 1.5%  / 대리점 0.5% — +1.0% 인센티브
    console.log('📝 Seeding sample commissions...');

    const krsAgencyRate = 0.5;  // KRS 대리점 고정율
    const bitAgencyRate = 0.5;  // BIT 대리점 고정율

    // 기쁨의교회 - 김정수 - KRS: 3.5% 계약
    //   채널풀 = 1.5%, 대리점 KRS 0.5%, 영업자 김정수 1.0%
    const bd001 = db.calcCommissionBreakdown(1000000, { contractRate: 3.5, agencyRate: krsAgencyRate, masterAgencyId: 'partner-001', salesAgentId: 'partner-003' });
    const bd002 = db.calcCommissionBreakdown(500000,  { contractRate: 3.5, agencyRate: krsAgencyRate, masterAgencyId: 'partner-001', salesAgentId: 'partner-003' });
    // 은혜성당 - 김정수 - KRS: 4.0% 계약 (더 높은 계약 → 영업자가 더 버는 구조)
    //   채널풀 = 2.0%, 대리점 KRS 0.5%, 영업자 김정수 1.5%
    const bd005 = db.calcCommissionBreakdown(800000,  { contractRate: 4.0, agencyRate: krsAgencyRate, masterAgencyId: 'partner-001', salesAgentId: 'partner-003' });
    // 고요한사찰 - 이수진 - BIT: 3.0% 계약 (표준)
    //   채널풀 = 1.0%, 대리점 BIT 0.5%, 영업자 이수진 0.5%
    const bd003 = db.calcCommissionBreakdown(300000,  { contractRate: 3.0, agencyRate: bitAgencyRate, masterAgencyId: 'partner-002', salesAgentId: 'partner-004' });
    // 고요한사찰 - 이수진 - BIT: 3.5% 계약
    //   채널풀 = 1.5%, 대리점 BIT 0.5%, 영업자 이수진 1.0%
    const bd004 = db.calcCommissionBreakdown(600000,  { contractRate: 3.5, agencyRate: bitAgencyRate, masterAgencyId: 'partner-002', salesAgentId: 'partner-004' });

    const commissions: db.PartnerCommission[] = [
      // ── 영업자 김정수 (partner-003) ──
      {
        id: 'comm-001',
        partnerId: 'partner-003', partnerRole: 'sales_agent',
        tenantId: '1', tenantName: '기쁨의교회',
        donationId: 'don-1', donationAmount: 1000000,
        commissionAmount: bd001.agentAmount,   // 1,000,000 × 1.0% = 10,000원
        commissionRate: bd001.agentRate,
        contractRate: 3.5,
        breakdown: bd001,
        status: 'settled', settledAt: '2026-06-30T12:00:00.000Z',
        createdAt: '2026-06-15T10:00:00.000Z',
      },
      {
        id: 'comm-002',
        partnerId: 'partner-003', partnerRole: 'sales_agent',
        tenantId: '1', tenantName: '기쁨의교회',
        donationId: 'don-2', donationAmount: 500000,
        commissionAmount: bd002.agentAmount,   // 500,000 × 1.0% = 5,000원
        commissionRate: bd002.agentRate,
        contractRate: 3.5,
        breakdown: bd002,
        status: 'pending',
        createdAt: '2026-07-10T10:00:00.000Z',
      },
      {
        id: 'comm-005',
        partnerId: 'partner-003', partnerRole: 'sales_agent',
        tenantId: '3', tenantName: '은혜성당',
        donationId: 'don-4', donationAmount: 800000,
        commissionAmount: bd005.agentAmount,   // 800,000 × 1.5% = 12,000원 (4% 계약 인센티브!)
        commissionRate: bd005.agentRate,
        contractRate: 4.0,
        breakdown: bd005,
        status: 'pending',
        createdAt: '2026-07-25T10:00:00.000Z',
      },
      // ── 대리점 KRS (partner-001) — 계약율에 무관하게 0.5% 고정 ──
      {
        id: 'comm-1m',
        partnerId: 'partner-001', partnerRole: 'master_agency',
        tenantId: '1', tenantName: '기쁨의교회',
        donationId: 'don-1', donationAmount: 1000000,
        commissionAmount: bd001.agencyAmount,  // 1,000,000 × 0.5% = 5,000원 (고정)
        commissionRate: bd001.agencyRate,
        contractRate: 3.5,
        breakdown: bd001,
        status: 'settled', settledAt: '2026-06-30T12:00:00.000Z',
        createdAt: '2026-06-15T10:00:00.000Z',
      },
      {
        id: 'comm-2m',
        partnerId: 'partner-001', partnerRole: 'master_agency',
        tenantId: '1', tenantName: '기쁨의교회',
        donationId: 'don-2', donationAmount: 500000,
        commissionAmount: bd002.agencyAmount,  // 500,000 × 0.5% = 2,500원 (고정)
        commissionRate: bd002.agencyRate,
        contractRate: 3.5,
        breakdown: bd002,
        status: 'pending',
        createdAt: '2026-07-10T10:00:00.000Z',
      },
      {
        id: 'comm-5m',
        partnerId: 'partner-001', partnerRole: 'master_agency',
        tenantId: '3', tenantName: '은혜성당',
        donationId: 'don-4', donationAmount: 800000,
        commissionAmount: bd005.agencyAmount,  // 800,000 × 0.5% = 4,000원 (고정 — 영업자 역량 무관)
        commissionRate: bd005.agencyRate,
        contractRate: 4.0,
        breakdown: bd005,
        status: 'pending',
        createdAt: '2026-07-25T10:00:00.000Z',
      },
      // ── 영업자 이수진 (partner-004) ──
      {
        id: 'comm-003',
        partnerId: 'partner-004', partnerRole: 'sales_agent',
        tenantId: '2', tenantName: '고요한사찰',
        donationId: 'don-3', donationAmount: 300000,
        commissionAmount: bd003.agentAmount,   // 300,000 × 0.5% = 1,500원 (3.0% 표준)
        commissionRate: bd003.agentRate,
        contractRate: 3.0,
        breakdown: bd003,
        status: 'settled', settledAt: '2026-06-30T12:00:00.000Z',
        createdAt: '2026-06-22T10:00:00.000Z',
      },
      {
        id: 'comm-004',
        partnerId: 'partner-004', partnerRole: 'sales_agent',
        tenantId: '2', tenantName: '고요한사찰',
        donationId: 'don-3-b', donationAmount: 600000,
        commissionAmount: bd004.agentAmount,   // 600,000 × 1.0% = 6,000원 (3.5% 계약)
        commissionRate: bd004.agentRate,
        contractRate: 3.5,
        breakdown: bd004,
        status: 'pending',
        createdAt: '2026-07-18T10:00:00.000Z',
      },
      // ── 대리점 BIT (partner-002) ──
      {
        id: 'comm-3m',
        partnerId: 'partner-002', partnerRole: 'master_agency',
        tenantId: '2', tenantName: '고요한사찰',
        donationId: 'don-3', donationAmount: 300000,
        commissionAmount: bd003.agencyAmount,  // 300,000 × 0.5% = 1,500원
        commissionRate: bd003.agencyRate,
        contractRate: 3.0,
        breakdown: bd003,
        status: 'settled', settledAt: '2026-06-30T12:00:00.000Z',
        createdAt: '2026-06-22T10:00:00.000Z',
      },
      {
        id: 'comm-4m',
        partnerId: 'partner-002', partnerRole: 'master_agency',
        tenantId: '2', tenantName: '고요한사찰',
        donationId: 'don-3-b', donationAmount: 600000,
        commissionAmount: bd004.agencyAmount,  // 600,000 × 0.5% = 3,000원
        commissionRate: bd004.agencyRate,
        contractRate: 3.5,
        breakdown: bd004,
        status: 'pending',
        createdAt: '2026-07-18T10:00:00.000Z',
      },
    ];

    for (const comm of commissions) {
      const key = `commission:${comm.partnerId}:${comm.id}`;
      await kv.set(key, comm);
      console.log(`  ✓ Upserted commission: ${comm.id} (계약 ${comm.contractRate}% | 수령 ${comm.commissionAmount.toLocaleString('ko-KR')}원 | 실효 ${comm.commissionRate}%)`);
    }

    console.log('✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}
