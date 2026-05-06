/**
 * Database Seeder
 * 
 * 초기 Mock 데이터를 KV 스토어에 저장합니다.
 * 이 파일은 서버 시작 시 한 번 실행되어야 합니다.
 */

import * as db from './database.tsx';

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
        },
        schedule: [
          { label: '주일 1부 예배', time: '오전 9:00' },
          { label: '주일 2부 예배', time: '오전 11:00' },
          { label: '수요예배', time: '오후 7:30' },
          { label: '금요기도회', time: '오후 7:30' },
        ],
        terminology: {
          donation: '헌금',
          member: '성도',
          prayer: '기도제목',
        },
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
        },
        schedule: [
          { label: '새벽예불', time: '오전 5:30' },
          { label: '일요법회', time: '오전 10:00' },
          { label: '수요법회', time: '오후 7:00' },
          { label: '참선수행', time: '매주 토요일 오후 2:00' },
        ],
        terminology: {
          donation: '보시',
          member: '불자',
          prayer: '발원문',
        },
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
        },
        schedule: [
          { label: '주일미사', time: '오전 9:00, 11:00, 오후 5:00' },
          { label: '평일미사', time: '오전 6:30, 오후 7:00' },
          { label: '토요미사', time: '오후 6:00' },
          { label: '고해성사', time: '매주 토요일 오후 4:00-5:30' },
        ],
        terminology: {
          donation: '봉헌',
          member: '교우',
          prayer: '미사지향',
        },
      },
    ];
    
    for (const tenant of tenants) {
      const existing = await db.getTenantById(tenant.id);
      if (!existing) {
        await db.createTenant(tenant);
        console.log(`  ✓ Created tenant: ${tenant.name}`);
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
    
    console.log('✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}
