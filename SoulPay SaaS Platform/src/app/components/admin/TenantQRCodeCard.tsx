import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  ExternalLink,
  Check,
  Sparkles,
  Layers,
  Palette,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Smartphone,
  Church,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tenant, DonationItem } from '../../context/AppContext';
import { getPayPortalUrl } from '../../utils/domainUtils';

interface TenantQRCodeCardProps {
  tenant: Tenant;
  donationItems?: DonationItem[];
}

export function TenantQRCodeCard({ tenant, donationItems = [] }: TenantQRCodeCardProps) {
  // 타겟 URL 선택 ('main' 또는 특정 항목명)
  const [selectedTarget, setSelectedTarget] = useState<'main' | string>('main');
  // QR 색상 모드 ('theme' 또는 'black')
  const [colorMode, setColorMode] = useState<'theme' | 'black'>('theme');
  // 중앙 로고 합성 여부
  const [includeLogo, setIncludeLogo] = useState<boolean>(Boolean(tenant.logoUrl));
  // 복사 여부
  const [isCopied, setIsCopied] = useState(false);
  // A4 POP 인쇄 미리보기 모달 상태
  const [showPrintModal, setShowPrintModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highResCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 단체 고유 기본 색상
  const themeColor = tenant.primaryColor || '#1B64DA';
  const qrColor = colorMode === 'theme' ? themeColor : '#000000';

  // 풀 모바일 봉헌 절대 URL 계산 (오프라인 인쇄 및 스마트폰 스캔용 공식 상용 도메인)
  const getAbsoluteBaseUrl = useCallback(() => {
    return `https://pay.soulpay.kr/${tenant.slug}`;
  }, [tenant.slug]);

  // 최종 QR 대상 URL
  const targetUrl = (() => {
    const base = getAbsoluteBaseUrl();
    if (selectedTarget === 'main') {
      return base;
    }
    return `${base}?item=${encodeURIComponent(selectedTarget)}`;
  })();

  // 캔버스에 QR 및 로고 합성 렌더링
  const renderQRCodeToCanvas = useCallback(
    async (targetCanvas: HTMLCanvasElement, size: number, isHighRes: boolean = false) => {
      try {
        await QRCode.toCanvas(targetCanvas, targetUrl, {
          width: size,
          margin: isHighRes ? 3 : 2,
          color: {
            dark: qrColor,
            light: '#FFFFFF',
          },
          errorCorrectionLevel: includeLogo && tenant.logoUrl ? 'H' : 'M',
        });

        // 중앙 로고 합성
        if (includeLogo && tenant.logoUrl) {
          const ctx = targetCanvas.getContext('2d');
          if (!ctx) return;

          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.src = tenant.logoUrl;

          await new Promise<void>((resolve) => {
            logoImg.onload = () => {
              const logoSize = Math.floor(size * 0.22);
              const logoPos = Math.floor((size - logoSize) / 2);
              const padding = Math.floor(logoSize * 0.12);
              const bgPos = logoPos - padding;
              const bgSize = logoSize + padding * 2;
              const radius = Math.floor(bgSize * 0.22);

              // 1. 중앙 흰색 라운드 배경 박스
              ctx.save();
              ctx.fillStyle = '#FFFFFF';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
              ctx.shadowBlur = isHighRes ? 12 : 6;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = isHighRes ? 4 : 2;

              ctx.beginPath();
              ctx.roundRect(bgPos, bgPos, bgSize, bgSize, radius);
              ctx.fill();
              ctx.restore();

              // 2. 미세한 테두리선
              ctx.save();
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
              ctx.lineWidth = isHighRes ? 2 : 1;
              ctx.beginPath();
              ctx.roundRect(bgPos, bgPos, bgSize, bgSize, radius);
              ctx.stroke();
              ctx.restore();

              // 3. 로고 이미지 라운드 클리핑 및 렌더링
              ctx.save();
              ctx.beginPath();
              ctx.roundRect(logoPos, logoPos, logoSize, logoSize, Math.floor(radius * 0.8));
              ctx.clip();
              ctx.drawImage(logoImg, logoPos, logoPos, logoSize, logoSize);
              ctx.restore();

              resolve();
            };
            logoImg.onerror = () => {
              // 이미지 로드 실패 시 QR만 유지
              resolve();
            };
          });
        }
      } catch (err) {
        console.error('QR code generation failed:', err);
      }
    },
    [targetUrl, qrColor, includeLogo, tenant.logoUrl]
  );

  // 화면 미리보기 캔버스 업데이트
  useEffect(() => {
    if (canvasRef.current) {
      renderQRCodeToCanvas(canvasRef.current, 280, false);
    }
  }, [renderQRCodeToCanvas]);

  // URL 복사
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setIsCopied(true);
      toast.success('모바일 봉헌 페이지 링크가 클립보드에 복사되었습니다');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('URL 복사에 실패했습니다');
    }
  };

  // 고화질 PNG 다운로드 (1024x1024)
  const handleDownloadPNG = async () => {
    try {
      const highResCanvas = document.createElement('canvas');
      highResCanvas.width = 1024;
      highResCanvas.height = 1024;
      await renderQRCodeToCanvas(highResCanvas, 1024, true);

      const dataUrl = highResCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      const suffix = selectedTarget === 'main' ? '메인' : selectedTarget;
      a.href = dataUrl;
      a.download = `${tenant.name}_모바일헌금_QR코드_${suffix}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('고해상도 QR코드(1024×1024)가 다운로드되었습니다');
    } catch (err) {
      console.error(err);
      toast.error('QR코드 다운로드 중 오류가 발생했습니다');
    }
  };

  // A4 현장 비치용 POP 전용 인쇄창 열기
  const handlePrintA4POP = () => {
    if (!canvasRef.current) return;
    const qrDataUrl = canvasRef.current.toDataURL('image/png');

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('팝업 차단이 활성화되어 있습니다. 팝업을 허용해주세요.');
      return;
    }

    const termLabel =
      tenant.religionType === 'buddhist'
        ? '스마트 온라인 보시·공덕 동참'
        : tenant.religionType === 'catholic'
        ? '스마트 모바일 봉헌'
        : '스마트 모바일 헌금';

    const selectedItemName = selectedTarget === 'main' ? '전체 수납 항목' : selectedTarget;

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>${tenant.name} - ${termLabel} 현장 안내</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif;
            background: #ffffff;
            color: #1e293b;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            min-height: 100vh;
            padding: 48px 40px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            text-align: center;
            width: 100%;
          }
          .badge {
            display: inline-block;
            font-size: 14px;
            font-weight: 800;
            color: ${themeColor};
            background: #f1f5f9;
            padding: 6px 18px;
            border-radius: 9999px;
            letter-spacing: 0.5px;
            margin-bottom: 14px;
          }
          .title {
            font-size: 38px;
            font-weight: 900;
            letter-spacing: -1px;
            color: #0f172a;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 18px;
            color: #64748b;
            font-weight: 600;
          }
          .target-pill {
            display: inline-block;
            margin-top: 10px;
            font-size: 13px;
            font-weight: 700;
            color: #334155;
            background: #e2e8f0;
            padding: 4px 12px;
            border-radius: 6px;
          }
          .qr-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: #ffffff;
            padding: 24px;
            border-radius: 28px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
            border: 2px solid #e2e8f0;
            margin: 24px 0;
          }
          .qr-img {
            width: 320px;
            height: 320px;
            display: block;
          }
          .qr-scan-guide {
            margin-top: 16px;
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .steps-grid {
            width: 100%;
            max-width: 600px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin: 12px 0;
          }
          .step-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 16px 12px;
            text-align: center;
          }
          .step-num {
            display: inline-flex;
            width: 28px;
            height: 28px;
            border-radius: 9999px;
            background: ${themeColor};
            color: #ffffff;
            font-size: 13px;
            font-weight: 800;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
          }
          .step-title {
            font-size: 13px;
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 4px;
          }
          .step-desc {
            font-size: 11px;
            color: #64748b;
            line-height: 1.4;
          }
          .footer {
            text-align: center;
            width: 100%;
            padding-top: 20px;
            border-top: 1px dashed #cbd5e1;
          }
          .footer-name {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
          }
          .footer-info {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
          }
          .footer-brand {
            margin-top: 8px;
            font-size: 10.5px;
            color: #94a3b8;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="badge">ONLINE DONATION QR CODE</div>
          <h1 class="title">${tenant.name}</h1>
          <p class="subtitle">${termLabel}</p>
          ${
            selectedTarget !== 'main'
              ? `<div class="target-pill">지정 항목: ${selectedItemName}</div>`
              : ''
          }
        </div>

        <div class="qr-container">
          <img src="${qrDataUrl}" alt="헌금 QR 코드" class="qr-img" />
          <div class="qr-scan-guide">
            <span>📷 스마트폰 카메라로 QR 코드를 비춰주세요</span>
          </div>
        </div>

        <div class="steps-grid">
          <div class="step-card">
            <div class="step-num">1</div>
            <div class="step-title">카메라 켜기</div>
            <div class="step-desc">기본 카메라 앱을 켜고 QR코드를 정면에 비춥니다.</div>
          </div>
          <div class="step-card">
            <div class="step-num">2</div>
            <div class="step-title">알림창 터치</div>
            <div class="step-desc">상단에 뜨는 웹사이트 바로가기 노란색 링크를 누릅니다.</div>
          </div>
          <div class="step-card">
            <div class="step-num">3</div>
            <div class="step-title">간편 결제</div>
            <div class="step-desc">금액을 확인하고 카드 또는 간편결제로 동참합니다.</div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-name">${tenant.name}</div>
          <div class="footer-info">
            ${tenant.address ? `주소: ${tenant.address}` : ''} 
            ${tenant.contact?.phone ? `· 문의전화: ${tenant.contact.phone}` : ''}
          </div>
          <div class="footer-brand">Powered by SoulPay Fintech SaaS · 금융보안원 보안 규격 준수</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <>
      <Card className="mb-6 border-slate-200 shadow-sm overflow-hidden">
        {/* 상단 타이틀 헤더 */}
        <CardHeader className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-transparent dark:from-blue-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: themeColor }}
              >
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                  모바일 헌금·보시 전용 QR코드 생성기
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    현장 비치 & 인쇄
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  주보, 헌금함, 종무소, 의자 뒷면 등에 부착할 단체 전용 고해상도 QR코드를 생성하고 인쇄합니다.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintA4POP}
                className="h-8 text-xs font-bold gap-1.5 cursor-pointer bg-white hover:bg-slate-50 text-slate-800"
              >
                <Printer className="h-3.5 w-3.5 text-blue-600" />
                A4 안내문 즉시 인쇄
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* 좌측 (4열): QR 코드 캔버스 미리보기 & 빠른 액션 */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative p-5 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex flex-col items-center group">
                <canvas ref={canvasRef} className="rounded-lg max-w-full h-auto" />
                
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                  스마트폰 카메라로 실시간 스캔 가능
                </div>
              </div>

              {/* URL 복사 및 링크 버튼 바 */}
              <div className="w-full mt-4 space-y-2">
                <div className="flex items-center gap-1.5 p-1.5 pl-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <span className="truncate flex-1 font-mono text-[11.5px] text-slate-700">
                    {targetUrl}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="h-7 px-2.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer shrink-0"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        복사
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPNG}
                    className="h-9 text-xs font-bold gap-1.5 cursor-pointer hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-600" />
                    고화질 PNG 다운
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => window.open(targetUrl, '_blank')}
                    style={{ backgroundColor: themeColor }}
                    className="h-9 text-xs font-bold gap-1.5 cursor-pointer text-white shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    새창에서 테스트
                  </Button>
                </div>
              </div>
            </div>

            {/* 우측 (7열): QR 옵션 설정 (타겟 URL, 색상, 로고 합성) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* 1. 연결 대상 페이지 선택 */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-600" />
                  스캔 시 이동할 대상 페이지
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('main')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedTarget === 'main'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">단체 메인 봉헌 홈</span>
                      {selectedTarget === 'main' && (
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      모든 헌금 항목과 슬라이드 배너가 노출되는 공식 첫 화면
                    </p>
                  </button>

                  {/* 특정 헌금 항목이 있을 경우 드롭다운 또는 선택 버튼 */}
                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      selectedTarget !== 'main'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 shadow-xs'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">특정 항목 직행 바로가기</span>
                      {selectedTarget !== 'main' && (
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    {donationItems.length > 0 ? (
                      <select
                        value={selectedTarget === 'main' ? '' : selectedTarget}
                        onChange={(e) => setSelectedTarget(e.target.value || 'main')}
                        className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">항목 선택...</option>
                        {donationItems.map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name} ({item.category || '기본'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[11px] text-slate-400">등록된 헌금 항목이 없습니다</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. QR 코드 컬러 스타일 */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-indigo-600" />
                  QR 코드 색상 스타일
                </Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setColorMode('theme')}
                    className={`flex-1 p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                      colorMode === 'theme'
                        ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: themeColor }}
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-800">단체 대표 테마색</div>
                      <div className="text-[10px] text-slate-400 font-mono">{themeColor}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setColorMode('black')}
                    className={`flex-1 p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                      colorMode === 'black'
                        ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-black shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-800">클래식 흑백 (권장)</div>
                      <div className="text-[10px] text-slate-400">어떤 조명에서도 최고 인식률</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. 중앙 로고 합성 옵션 */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-amber-600" />
                  중앙 단체 로고 삽입
                </Label>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {tenant.logoUrl ? (
                        <img src={tenant.logoUrl} alt="로고" className="w-full h-full object-cover" />
                      ) : (
                        <Church className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {tenant.logoUrl ? 'QR 코드 중앙에 단체 로고 합성' : '등록된 단체 로고 없음'}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {tenant.logoUrl
                          ? '로고를 삽입하여 신도들에게 단체의 신뢰감을 높여줍니다'
                          : '기본 정보의 [로고 이미지 설정]에서 로고를 먼저 등록해주세요'}
                      </p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={includeLogo && Boolean(tenant.logoUrl)}
                    disabled={!tenant.logoUrl}
                    onChange={(e) => setIncludeLogo(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                </div>
              </div>

              {/* 활용 팁 안내 박스 */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  오프라인 현장 배치 추천 가이드
                </div>
                <ul className="text-[11.5px] text-amber-800/90 list-disc pl-4 space-y-0.5 pt-1">
                  <li><strong>주보 / 소식지 인쇄</strong>: 고화질 PNG를 다운로드하여 주보 하단에 작게 인쇄</li>
                  <li><strong>예배당 의자 뒤편 / 법당 기둥</strong>: A4 안내문을 인쇄하여 아크릴 스탠드에 비치</li>
                  <li><strong>헌금함 / 불전함 앞</strong>: 현금 없는 신도들을 위해 헌금함 바로 옆에 부착</li>
                </ul>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
