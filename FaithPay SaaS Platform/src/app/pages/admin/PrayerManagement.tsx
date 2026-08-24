import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { Menu, Printer, Download, CheckCircle2, FileSpreadsheet, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { AdminSidebar } from '../../components/AdminSidebar';
import { donationAPI } from '../../api/client';
import { useTenantTerms } from '../../hooks/useTenantTerms';

interface PrayerItem {
  id: string;
  name: string;
  item: string;
  prayer: string;
  date: string;
  printed: boolean;
}

export type LabelFormatType = 'formtec_3108' | 'formtec_3107' | 'roll_5030' | 'a4_report';

export default function PrayerManagement() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();
  const terms = useTenantTerms(currentTenant?.orgType);

  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrayers, setSelectedPrayers] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [labelFormat, setLabelFormat] = useState<LabelFormatType>('formtec_3108');

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  useEffect(() => {
    async function loadPrayers() {
      if (!currentTenant) return;
      setIsLoading(true);
      try {
        const res = await donationAPI.getByTenant(currentTenant.id);
        if (res.success && res.data) {
          const prayerList: PrayerItem[] = res.data
            .filter((d: any) => d.prayerText && String(d.prayerText).trim() !== '')
            .map((d: any, idx: number) => ({
              id: d.id ? `${d.id}_${idx}` : `prayer_${idx}_${Date.now()}`,
              name: d.donorName || '익명',
              item: d.itemName || '일반후원',
              prayer: String(d.prayerText),
              date: d.createdAt ? d.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
              printed: Boolean(d.printed),
            }));
          setPrayers(prayerList);
        } else {
          setPrayers([]);
        }
      } catch (err) {
        console.error('Error fetching prayers:', err);
        setPrayers([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadPrayers();
  }, [currentTenant]);

  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">단체 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!currentAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>관리자 로그인이 필요합니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end pt-4">
            <Button onClick={() => navigate('/admin/login')}>
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPath = `/${tenantSlug}/admin/prayers`;

  const filteredPrayers = prayers.filter((prayer) => {
    if (filter === 'unprinted') return !prayer.printed;
    if (filter === 'printed') return prayer.printed;
    return true;
  });

  const unprintedCount = prayers.filter((p) => !p.printed).length;

  const togglePrayer = (id: string) => {
    setSelectedPrayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // 🖨️ 대한민국 표준 라벨지 규격 인쇄 엔진 (Formtec / Roll Printer Engine)
  const handlePrint = (targetIds: string[], formatOverride?: LabelFormatType) => {
    const selectedFormat = formatOverride || labelFormat;
    if (targetIds.length === 0) {
      toast.error('인쇄할 항목을 선택해주세요');
      return;
    }

    const itemsToPrint = prayers.filter((p) => targetIds.includes(p.id));
    if (itemsToPrint.length === 0) {
      toast.error('인쇄할 항목 정보를 찾을 수 없습니다.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) {
      toast.error('팝업 차단이 설정되어 있습니다. 팝업 차단을 해제해 주세요.');
      return;
    }

    const orgName = currentTenant.name || '단체명';
    const prayerTerm = terms.prayer || '메시지/지향';

    let printHtml = '';

    if (selectedFormat === 'formtec_3108') {
      // 🏆 1위: 폼텍 3108 / 애니라벨 V3108 (A4 16칸 - 2열 × 8행 / 99.1mm × 33.9mm)
      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${orgName} - 폼텍 3108 라벨 인쇄</title>
            <meta charset="utf-8" />
            <style>
              @media print {
                @page { size: A4 portrait; margin: 12mm 5mm 12mm 5mm; }
                body { margin: 0; padding: 0; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; }
                .sheet { page-break-after: always; }
              }
              body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; margin: 0; padding: 0; background: #fff; }
              .grid-3108 {
                display: grid;
                grid-template-columns: 99.1mm 99.1mm;
                column-gap: 2.5mm;
                row-gap: 0mm;
                justify-content: center;
              }
              .cell-3108 {
                width: 99.1mm;
                height: 33.9mm;
                box-sizing: border-box;
                padding: 3mm 4mm;
                border: 1px dashed #ccc;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                background: #fff;
              }
              @media print {
                .cell-3108 { border: none; }
              }
              .c-header { display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 2px; }
              .c-name { font-weight: 900; font-size: 13px; color: #000; }
              .c-item { font-weight: bold; font-size: 11px; color: #1d4ed8; }
              .c-body { font-size: 11px; font-weight: 600; line-height: 1.4; color: #111; margin: 3px 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-all; }
              .c-footer { display: flex; justify-content: space-between; font-size: 9px; color: #666; border-top: 0.5px solid #ddd; padding-top: 2px; }
            </style>
          </head>
          <body>
            <div class="grid-3108">
              ${itemsToPrint
                .map(
                  (item) => `
                <div class="cell-3108">
                  <div class="c-header">
                    <span class="c-name">신청자: ${item.name}</span>
                    <span class="c-item">[${item.item}]</span>
                  </div>
                  <div class="c-body">${item.prayer}</div>
                  <div class="c-footer">
                    <span>${orgName}</span>
                    <span>${item.date}</span>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </body>
        </html>
      `;
    } else if (selectedFormat === 'formtec_3107') {
      // 🥈 2위: 폼텍 3107 / 애니라벨 V3107 (A4 21칸 - 3열 × 7행 / 63.5mm × 38.1mm)
      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${orgName} - 폼텍 3107 라벨 인쇄</title>
            <meta charset="utf-8" />
            <style>
              @media print {
                @page { size: A4 portrait; margin: 15mm 7mm; }
                body { margin: 0; padding: 0; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; }
              }
              body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; margin: 0; padding: 0; background: #fff; }
              .grid-3107 {
                display: grid;
                grid-template-columns: 63.5mm 63.5mm 63.5mm;
                column-gap: 2mm;
                row-gap: 0mm;
                justify-content: center;
              }
              .cell-3107 {
                width: 63.5mm;
                height: 38.1mm;
                box-sizing: border-box;
                padding: 3mm;
                border: 1px dashed #ccc;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                background: #fff;
              }
              @media print {
                .cell-3107 { border: none; }
              }
              .c-header { display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 2px; }
              .c-name { font-weight: 900; font-size: 11px; color: #000; }
              .c-item { font-weight: bold; font-size: 9.5px; color: #1d4ed8; }
              .c-body { font-size: 9.5px; font-weight: 600; line-height: 1.3; color: #111; margin: 2px 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; word-break: break-all; }
              .c-footer { display: flex; justify-content: space-between; font-size: 8px; color: #666; border-top: 0.5px solid #ddd; padding-top: 2px; }
            </style>
          </head>
          <body>
            <div class="grid-3107">
              ${itemsToPrint
                .map(
                  (item) => `
                <div class="cell-3107">
                  <div class="c-header">
                    <span class="c-name">${item.name}</span>
                    <span class="c-item">[${item.item}]</span>
                  </div>
                  <div class="c-body">${item.prayer}</div>
                  <div class="c-footer">
                    <span>${orgName}</span>
                    <span>${item.date}</span>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </body>
        </html>
      `;
    } else if (selectedFormat === 'roll_5030') {
      // 🥉 3위: 감열 롤 라벨 (1열 롤 - 50mm × 30mm)
      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${orgName} - 롤 라벨 인쇄</title>
            <meta charset="utf-8" />
            <style>
              @media print {
                @page { size: 50mm 30mm; margin: 0; }
                body { margin: 0; padding: 0; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; }
                .roll-page { page-break-after: always; page-break-inside: avoid; }
              }
              body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; margin: 0; padding: 0; background: #fff; }
              .roll-card {
                width: 50mm;
                height: 30mm;
                box-sizing: border-box;
                padding: 3.5mm;
                border: 1px dashed #bbb;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                background: #fff;
              }
              @media print {
                .roll-card { border: none; }
              }
              .c-header { display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 2px; }
              .c-name { font-weight: 900; font-size: 11px; color: #000; }
              .c-item { font-weight: bold; font-size: 9.5px; color: #1d4ed8; }
              .c-body { font-size: 9.5px; font-weight: 600; line-height: 1.3; color: #111; margin: 2px 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-all; }
              .c-footer { display: flex; justify-content: space-between; font-size: 8px; color: #666; border-top: 0.5px solid #ddd; padding-top: 2px; }
            </style>
          </head>
          <body>
            ${itemsToPrint
              .map(
                (item) => `
              <div class="roll-page">
                <div class="roll-card">
                  <div class="c-header">
                    <span class="c-name">${item.name}</span>
                    <span class="c-item">[${item.item}]</span>
                  </div>
                  <div class="c-body">${item.prayer}</div>
                  <div class="c-footer">
                    <span>${orgName}</span>
                    <span>${item.date}</span>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </body>
        </html>
      `;
    } else {
      // 📄 A4 서식 대장 인쇄 (보고서 보관용)
      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${orgName} - ${prayerTerm} A4 대장 서식</title>
            <meta charset="utf-8" />
            <style>
              @media print {
                @page { size: A4 portrait; margin: 15mm; }
                body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #111; }
              }
              body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 20px; background: #fff; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 22px; color: #111; }
              .header p { margin: 4px 0 0 0; font-size: 13px; color: #666; }
              .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
              .card { border: 1.5px solid #333; border-radius: 8px; padding: 14px; background: #fafafa; page-break-inside: avoid; }
              .card-header { display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding-bottom: 6px; margin-bottom: 8px; font-size: 13px; }
              .card-title { font-weight: bold; font-size: 15px; color: #000; }
              .card-item { color: #2563eb; font-weight: bold; }
              .card-body { font-size: 14px; line-height: 1.5; color: #222; min-height: 50px; white-space: pre-wrap; word-break: break-all; }
              .card-footer { text-align: right; font-size: 11px; color: #888; margin-top: 10px; border-top: 1px solid #eee; pt: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${orgName} ${prayerTerm} A4 대장 출력물</h1>
              <p>인쇄 일시: ${new Date().toLocaleString()} | 총 ${itemsToPrint.length}건</p>
            </div>
            <div class="grid">
              ${itemsToPrint
                .map(
                  (item) => `
                <div class="card">
                  <div class="card-header">
                    <span class="card-title">신청자: ${item.name}</span>
                    <span class="card-item">[${item.item}]</span>
                  </div>
                  <div class="card-body">${item.prayer}</div>
                  <div class="card-footer">접수일자: ${item.date} | SoulPay 정품 발급</div>
                </div>
              `
                )
                .join('')}
            </div>
          </body>
        </html>
      `;
    }

    printWindow.document.write(printHtml);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);

    setPrayers((prev) =>
      prev.map((p) => (targetIds.includes(p.id) ? { ...p, printed: true } : p))
    );
    setSelectedPrayers([]);

    const formatLabelMap: Record<LabelFormatType, string> = {
      formtec_3108: '폼텍 3108 (A4 16칸)',
      formtec_3107: '폼텍 3107 (A4 21칸)',
      roll_5030: '감열 롤 라벨 (50x30mm)',
      a4_report: 'A4 대장',
    };
    toast.success(`${itemsToPrint.length}건의 ${prayerTerm} [${formatLabelMap[selectedFormat]}] 서식을 출력창으로 전송했습니다.`);
  };

  // 📊 2. 실제 CSV 엑셀 다운로드 엔진 (Export Engine)
  const handleExport = () => {
    if (filteredPrayers.length === 0) {
      toast.error('다운로드할 내역이 없습니다.');
      return;
    }

    const headers = ['성명', '후원항목', `${terms.prayer} 내용`, '접수일자', '인쇄여부'];
    const csvRows = [headers.join(',')];

    filteredPrayers.forEach((p) => {
      const cleanName = `"${p.name.replace(/"/g, '""')}"`;
      const cleanItem = `"${p.item.replace(/"/g, '""')}"`;
      const cleanPrayer = `"${p.prayer.replace(/"/g, '""')}"`;
      const status = p.printed ? '인쇄 완료' : '미인쇄';
      csvRows.push([cleanName, cleanItem, cleanPrayer, p.date, status].join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentTenant.name}_${terms.prayer}_목록_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${filteredPrayers.length}건의 내역을 엑셀 CSV 파일로 다운로드했습니다.`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-100">
                {terms.prayer} 관리 센터
              </h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                후원자분들이 작성하신 {terms.prayer} 내역을 대한민국 표준 라벨지 서식으로 즉시 출력합니다.
              </p>
            </div>
            <Button variant="outline" onClick={handleExport} className="gap-2 cursor-pointer self-start md:self-auto">
              <Download className="h-4 w-4" />
              엑셀 CSV 다운로드
            </Button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  전체 {terms.prayer} 건수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-900 dark:text-zinc-100">
                  {prayers.length}건
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  미인쇄 대기
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {unprintedCount}건
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  인쇄 출력 완료
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {prayers.length - unprintedCount}건
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Label Format Selector Card */}
          <Card className="border-indigo-100 dark:border-indigo-900/40">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">조회 필터:</label>
                    <Select value={filter} onValueChange={setFilter}>
                      <SelectTrigger className="w-[140px] bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체보기</SelectItem>
                        <SelectItem value="unprinted">⏳ 미인쇄 대기만</SelectItem>
                        <SelectItem value="printed">✅ 인쇄 완료만</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      라벨지 폼 규격:
                    </label>
                    <Select value={labelFormat} onValueChange={(val) => setLabelFormat(val as LabelFormatType)}>
                      <SelectTrigger className="w-[250px] bg-white text-xs font-bold border-indigo-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formtec_3108">
                          🏆 폼텍 3108 / 애니라벨 (A4 16칸 / 99.1x33.9mm) [인기 1위]
                        </SelectItem>
                        <SelectItem value="formtec_3107">
                          🥈 폼텍 3107 / 애니라벨 (A4 21칸 / 63.5x38.1mm)
                        </SelectItem>
                        <SelectItem value="roll_5030">
                          🥉 감열식 롤 라벨 (1열 / 50x30mm 롤프린터)
                        </SelectItem>
                        <SelectItem value="a4_report">
                          📄 A4 서식 대장 (보고서 보관용)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-auto">
                  <Button
                    onClick={() => handlePrint(selectedPrayers)}
                    disabled={selectedPrayers.length === 0}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    선택 항목 라벨 인쇄 ({selectedPrayers.length}건)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prayer List Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">
                  {terms.prayer} 명세 목록 ({filteredPrayers.length}건)
                </CardTitle>
                <CardDescription>인쇄할 항목을 선택 후 [선택 항목 라벨 인쇄]를 누르시면 상단에 설정된 규격대로 정밀 출력됩니다</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedPrayers.length === filteredPrayers.length &&
                          filteredPrayers.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPrayers(filteredPrayers.map((p) => p.id));
                          } else {
                            setSelectedPrayers([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>성명</TableHead>
                    <TableHead>후원 항목</TableHead>
                    <TableHead>{terms.prayer} 전문</TableHead>
                    <TableHead>접수일자</TableHead>
                    <TableHead>인쇄 상태</TableHead>
                    <TableHead className="text-right">단일 출력</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400 space-y-2">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                        <p className="font-semibold text-sm">등록된 {terms.prayer} 내역이 없습니다.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPrayers.map((prayer) => (
                      <TableRow key={prayer.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPrayers.includes(prayer.id)}
                            onCheckedChange={() => togglePrayer(prayer.id)}
                          />
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-zinc-100">
                          {prayer.name}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-zinc-300">
                          {prayer.item}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="line-clamp-2 text-xs text-slate-800 dark:text-zinc-200 font-medium">
                            {prayer.prayer}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">{prayer.date}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              prayer.printed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px]'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[11px]'
                            }
                          >
                            {prayer.printed ? '✅ 인쇄 완료' : '⏳ 미인쇄'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint([prayer.id])}
                            className="h-7 px-2 text-xs gap-1 cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            출력
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}