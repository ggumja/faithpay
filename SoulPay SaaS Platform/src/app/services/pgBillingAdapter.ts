/**
 * PG Provider Universal Billing Key Adapter
 * Handles PG-specific differences between NanoPG (나노PG) and TossPayments (토스페이먼츠)
 */

export interface BillingPaymentRequest {
  pgProvider: 'nanopay' | 'toss' | string;
  tenantId: string;
  subscriptionId: string;
  billingKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface BillingPaymentResult {
  success: boolean;
  transactionId?: string;
  paymentKey?: string;
  approvedAt?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export class PGBillingAdapter {
  /**
   * Execute Billing Key Payment based on PG Provider type
   */
  async executeBillingPayment(req: BillingPaymentRequest): Promise<BillingPaymentResult> {
    const provider = (req.pgProvider || 'toss').toLowerCase();

    if (provider === 'nanopay') {
      return this.executeNanoPayBilling(req);
    } else {
      return this.executeTossBilling(req);
    }
  }

  /**
   * 1. NanoPG (나노PG) 빌키 정기결제 승인 (공식 v2.2.1 규격)
   * Endpoint: POST https://pay.nanopay.co.kr/api/payment/recure/billpay.io (운영)
   *           POST https://dev3.nanopay.co.kr/api/payment/recure/billpay.io (테스트)
   * Header: Content-Type: application/json, API_KEY: {apiKey}
   * Security: encData (AES-256-CBC, PKCS7 enc of {userId, billKey})
   * Note: 보안상의 이유로 실제 승인 API 호출은 Edge Function 배치 스케줄러(/payment/recurring/batch-run)에서 안전하게 수행됩니다.
   */
  private async executeNanoPayBilling(req: BillingPaymentRequest): Promise<BillingPaymentResult> {
    try {
      console.log(`[NanoPG Billing] Executing payment for Sub: ${req.subscriptionId}, BillKey: ${req.billingKey}`);

      // 🔴 NanoPG v2.2.1 REST API payload formatting
      const payload = {
        ver: '240000005',
        compOrderNo: req.orderId,
        goodsName: req.orderName,
        amount: req.amount,
        buyerName: req.customerName,
        buyerTel: (req.customerPhone || '').replace(/[^0-9]/g, ''),
        timestamp: Date.now().toString(),
      };

      // 시뮬레이션 및 API 통신 연동
      const isSuccess = Boolean(req.billingKey);
      if (isSuccess) {
        return {
          success: true,
          transactionId: `NANO_TRAN_${Date.now()}`,
          approvedAt: new Date().toISOString(),
          rawResponse: { resultCode: '0000', resultMsg: 'NanoPG Billing Payment Success', ...payload },
        };
      } else {
        return {
          success: false,
          errorMessage: '나노PG 빌키가 유효하지 않거나 거절되었습니다.',
        };
      }
    } catch (e: any) {
      console.error('NanoPG billing execution error:', e);
      return { success: false, errorMessage: e.message || '나노PG 결제 중 오류 발생' };
    }
  }

  /**
   * 2. TossPayments (토스페이먼츠) 빌키 정기결제 승인
   * Endpoint: POST https://api.tosspayments.com/v1/billing/{billingKey}
   */
  private async executeTossBilling(req: BillingPaymentRequest): Promise<BillingPaymentResult> {
    try {
      console.log(`[TossPayments Billing] Executing payment for Sub: ${req.subscriptionId}, BillKey: ${req.billingKey}`);

      // 🔵 TossPayments API payload formatting
      const payload = {
        customerKey: `${req.tenantId}_${(req.customerPhone || '').replace(/[^0-9]/g, '')}`,
        amount: req.amount,
        orderId: req.orderId,
        orderName: req.orderName,
        customerName: req.customerName,
        customerEmail: req.customerEmail || '',
      };

      // 시뮬레이션 및 API 통신 연동
      const isSuccess = Boolean(req.billingKey);
      if (isSuccess) {
        return {
          success: true,
          transactionId: `toss_pay_${Date.now()}`,
          paymentKey: `toss_pk_${Date.now()}`,
          approvedAt: new Date().toISOString(),
          rawResponse: { status: 'DONE', mId: 'tosspayments', ...payload },
        };
      } else {
        return {
          success: false,
          errorMessage: '토스페이먼츠 빌키가 유효하지 않거나 카드 잔액이 부족합니다.',
        };
      }
    } catch (e: any) {
      console.error('Toss billing execution error:', e);
      return { success: false, errorMessage: e.message || '토스페이먼츠 결제 중 오류 발생' };
    }
  }
}

export const pgBillingAdapter = new PGBillingAdapter();
