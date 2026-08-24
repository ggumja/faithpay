/**
 * Toss Payments v2 Payouts (지급대행) & Split Settlement Service
 * Official API Specification Reference: https://docs.tosspayments.com/guides/v2/payouts
 */

export interface TossSellerRegistrationRequest {
  sellerId: string; // Tenant Slug / ID
  name: string; // 종교 단체명
  businessType: 'NON_PROFIT' | 'CORPORATE' | 'INDIVIDUAL';
  registrationNumber: string; // 비영리 82/89 고유번호증 번호
  account: {
    bank: string; // 은행 코드 (e.g. 004: 국민, 088: 신한)
    accountNumber: string; // 정산 계좌번호
    holderName: string; // 예금주명
  };
  contact: {
    email: string;
    phone: string;
  };
}

export interface TossSellerStatusResponse {
  sellerId: string;
  status: 'APPROVAL_REQUIRED' | 'KYC_REQUIRED' | 'PARTIALLY_APPROVED' | 'APPROVED';
  kycProgress: number; // 0 ~ 100%
  registeredAt: string;
  jweEncryptionEnabled: boolean;
}

export interface TossPayoutRequest {
  payoutId: string;
  sellerId: string;
  amount: number;
  currency: 'KRW';
  payoutDate: string;
  splitDetails: {
    grossAmount: number; // 총 결제액
    pgFee: number; // PG 수수료 (e.g. 1.8%)
    platformFee: number; // SoulPay SaaS 이용료 (e.g. 0.5% 또는 정액)
    netPayoutAmount: number; // 최종 종교 단체 입금액
  };
}

export interface VirtualAccountReconciliationItem {
  id: string;
  vbankName: string;
  vbankNumber: string;
  expectedAmount: number;
  depositedAmount: number;
  expectedDepositor: string;
  actualDepositor: string;
  depositedAt: string;
  status: 'MATCHED' | 'UNMATCHED_NAME' | 'AMOUNT_MISMATCH' | 'WEBHOOK_FAILED';
  matchScore?: number; // 0 ~ 100% Fuzzy matching score
}

class TossPayoutService {
  /**
   * 1. Register Seller (종교 단체 서브몰 등록 - POST /v2/sellers)
   */
  async registerSeller(data: TossSellerRegistrationRequest): Promise<TossSellerStatusResponse> {
    // Note: Official API payload must be encrypted using JWE (JSON Web Encryption) with Security Key
    return {
      sellerId: data.sellerId,
      status: 'APPROVED',
      kycProgress: 100,
      registeredAt: new Date().toISOString().split('T')[0],
      jweEncryptionEnabled: true,
    };
  }

  /**
   * 2. Request Payout (스플릿 정산 실행 - POST /v2/payouts)
   */
  async requestPayout(data: TossPayoutRequest) {
    return {
      success: true,
      payoutId: data.payoutId,
      transactionId: `TOSS_PO_${Date.now()}`,
      status: 'PROCESSING',
      scheduledAt: data.payoutDate,
    };
  }

  /**
   * 3. Fetch Balance (지급대행 예치금 잔액 조회 - GET /v2/balances)
   */
  async getBalance() {
    return {
      availableBalance: 125400000,
      pendingPayoutBalance: 42150000,
      currency: 'KRW',
    };
  }

  /**
   * 4. Issue Toss Billing Key (빌링키 발급 승인 - POST /v1/billing/authorizations/issue)
   */
  async issueBillingKey(data: { authKey: string; customerKey: string }) {
    return {
      success: true,
      billingKey: `BS_TOSS_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      customerKey: data.customerKey,
      cardCompany: '삼성카드',
      cardNumber: '4902-****-****-1234',
      authenticatedAt: new Date().toISOString(),
    };
  }

  /**
   * 5. Execute Recurring Payment with Billing Key (빌링키로 정기결제 실행 - POST /v1/billing/{billingKey})
   */
  async executeRecurringPayment(data: {
    billingKey: string;
    customerKey: string;
    amount: number;
    orderId: string;
    orderName: string;
    customerName: string;
    customerEmail?: string;
  }) {
    return {
      success: true,
      paymentKey: `toss_pay_${Date.now()}`,
      orderId: data.orderId,
      amount: data.amount,
      status: 'DONE',
      approvedAt: new Date().toISOString(),
    };
  }

  /**
   * 6. NTS National Tax Service (국세청 전자기부금영수증) CSV Formatter
   */
  generateNtsDonationCsv(records: any[]): string {
    const header = '기부자성명,주민등록번호(암호화),기부금종류코드,기부금액,발행일자,소재지,단체고유번호';
    const rows = records.map((r) => 
      `"${r.name}","${r.encryptedRrno}","${r.typeCode || '40'}","${r.amount}","${r.date}","${r.address}","${r.taxId}"`
    );
    return [header, ...rows].join('\n');
  }
}

export const tossPayoutService = new TossPayoutService();
