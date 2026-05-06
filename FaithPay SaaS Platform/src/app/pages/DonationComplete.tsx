import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { CheckCircle2, Download, Share2, Home } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

export default function DonationComplete() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, donationFormData } = useApp();
  const [receiptId] = useState(() => `FP${Date.now().toString().slice(-8)}`);

  useEffect(() => {
    // Confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  if (!currentTenant || !donationFormData) {
    return null;
  }

  const handleShare = () => {
    toast.success('카카오톡 공유 기능은 실제 환경에서 구현됩니다');
  };

  const handleDownload = () => {
    toast.success('영수증 이미지 저장 기능은 실제 환경에서 구현됩니다');
  };

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div
        className="text-white py-12 px-4"
        style={{
          background: `linear-gradient(135deg, ${currentTenant.primaryColor} 0%, ${currentTenant.primaryColor}dd 100%)`,
        }}
      >
        <div className="container mx-auto max-w-2xl text-center">
          <CheckCircle2 className="h-20 w-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">
            {currentTenant.terminology.donation}이 완료되었습니다
          </h1>
          <p className="text-white/90 text-lg">
            당신의 정성에 감사드립니다
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6">
          {/* Receipt Card */}
          <Card className="shadow-xl">
            <CardContent className="pt-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">{currentTenant.name}</h2>
                <p className="text-muted-foreground">
                  {currentTenant.terminology.donation} 증명서
                </p>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">접수번호</span>
                  <span className="font-mono font-semibold">{receiptId}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">일시</span>
                  <span className="font-medium">{formattedDate}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">항목</span>
                  <span className="font-medium">{donationFormData.itemName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">성명</span>
                  <span className="font-medium">{donationFormData.name}</span>
                </div>

                {donationFormData.baptismName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">세례명</span>
                    <span className="font-medium">{donationFormData.baptismName}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">전화번호</span>
                  <span className="font-medium">{donationFormData.phone}</span>
                </div>

                {donationFormData.isRecurring && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">결제 유형</span>
                    <span className="font-medium text-blue-600">
                      정기 결제 (매월 {donationFormData.recurringDay}일)
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xl font-semibold">금액</span>
                  <span
                    className="text-3xl font-bold"
                    style={{ color: currentTenant.primaryColor }}
                  >
                    {donationFormData.amount.toLocaleString()}원
                  </span>
                </div>

                {donationFormData.prayerText && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground mb-2">
                        {currentTenant.terminology.prayer}
                      </p>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {donationFormData.prayerText}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {donationFormData.familyMembers && donationFormData.familyMembers.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground mb-2">가족 정보</p>
                      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                        {donationFormData.familyMembers.map((member, index) => (
                          <div key={index} className="text-sm">
                            {member.name} ({member.birthDate}, {member.calendar === 'solar' ? '양력' : '음력'})
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Separator className="my-6" />

              <div className="text-center text-sm text-muted-foreground">
                <p>이 영수증은 법적 효력이 있는 공식 증명서입니다</p>
                <p className="mt-1">문의사항: FaithPay 고객센터 1234-5678</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={handleShare} className="h-14">
              <Share2 className="h-4 w-4 mr-2" />
              카카오톡 공유
            </Button>
            <Button variant="outline" onClick={handleDownload} className="h-14">
              <Download className="h-4 w-4 mr-2" />
              이미지 저장
            </Button>
          </div>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">알림톡이 발송되었습니다</h3>
              <p className="text-sm text-muted-foreground">
                {donationFormData.phone}으로 카카오 알림톡이 발송되었습니다.
                영수증은 언제든지 확인하실 수 있습니다.
              </p>
              {donationFormData.isRecurring && (
                <p className="text-sm text-blue-700 mt-2 font-medium">
                  정기 결제는 마이페이지에서 관리하실 수 있습니다.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Home Button */}
          <Button
            className="w-full h-14 text-lg font-semibold"
            onClick={() => navigate(`/${tenantSlug}`)}
            style={{ backgroundColor: currentTenant.primaryColor }}
          >
            <Home className="h-5 w-5 mr-2" />
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}
