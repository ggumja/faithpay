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
import { Menu, Printer, Download, CheckCircle2 } from 'lucide-react';
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

export default function PrayerManagement() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();
  const terms = useTenantTerms(currentTenant?.orgType);

  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrayers, setSelectedPrayers] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('all');

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

  // 🖨️ 1. 실제 브라우저 인쇄 실행 엔진 (Print Engine)
  const handlePrint = (targetIds: string[]) => {
    if (targetIds.length === 0) {
      toast.error('인쇄할 항목을 선택해주세요');
      return;
    }

    const itemsToPrint = prayers.filter((p) => targetIds.includes(p.id));
    if (itemsToPrint.length === 0) {
      toast.error('인쇄할 항목 정보를 찾을 수 없습니다.');
      return;
    }

    // 인쇄용 새 창 열기
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast.error('팝업 차단이 설정되어 있습니다. 팝업 차단을 해제해 주세요.');
      return;
    }

    const orgName = currentTenant.name || '단체명';
    const prayerTerm = terms.prayer || '메시지/지향';

    // 서식 HTML 인쇄용 문서 생성
    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${orgName} - ${prayerTerm} 출력 서식</title>
          <meta charset="utf-8" />
          <style>
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #111; }
              .no-print { display: none !important; }
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
            <h1>${orgName} ${prayerTerm} 출력물</h1>
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
                <div class="card-footer">접수일자: ${item.date} | FaithPay 정품 발급</div>
              </div>
            `
              )
              .join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();

    // 렌더링 완료 후 인쇄 다이얼로그 호출
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);

    // 인쇄 완료 상태 업데이트
    setPrayers((prev) =>
      prev.map((p) => (targetIds.includes(p.id) ? { ...p, printed: true } : p))
    );
    setSelectedPrayers([]);
    toast.success(`${itemsToPrint.length}건의 ${prayerTerm} 서식을 출력창으로 전송했습니다.`);
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

    const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM 추가 (엑셀 한글 깨짐 방지)
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
      <div className="hidden lg:block w-64 flex-shrink-0">
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
                후원자분들이 작성하신 {terms.prayer} 내역을 실시간 조회하고 팝업 서식으로 출력할 수 있습니다.
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

          {/* Filters and Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-600">조회 필터:</label>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[180px] bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체보기</SelectItem>
                      <SelectItem value="unprinted">⏳ 미인쇄 대기만</SelectItem>
                      <SelectItem value="printed">✅ 인쇄 완료만</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => handlePrint(selectedPrayers)}
                  disabled={selectedPrayers.length === 0}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  선택 항목 인쇄 서식 출력 ({selectedPrayers.length}건)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Prayer List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">
                  {terms.prayer} 명세 목록 ({filteredPrayers.length}건)
                </CardTitle>
                <CardDescription>인쇄할 항목을 체크박스로 선택 후 상단 [선택 항목 인쇄]를 누르세요</CardDescription>
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