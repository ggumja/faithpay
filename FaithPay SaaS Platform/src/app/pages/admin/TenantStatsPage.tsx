import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../api/client';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';


interface TenantStats {
  tenant: {
    id: string;
    name: string;
    religionType: string;
    slug: string;
  };
  stats: {
    tenantId: string;
    year: number;
    month: number;
    totalAmount: number;
    totalCount: number;
    recurringAmount: number;
    recurringCount: number;
    oneTimeAmount: number;
    oneTimeCount: number;
    byType: Record<string, { amount: number; count: number }>;
    byPaymentMethod: Record<string, { amount: number; count: number }>;
  };
}

export default function TenantStatsPage() {
  const [allStats, setAllStats] = useState<TenantStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchAllStats();
  }, [selectedYear, selectedMonth]);

  const fetchAllStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/stats/all/${selectedYear}/${selectedMonth}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );


      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setAllStats(result.data);
      } else {
        setAllStats([]);
      }




      setAllStats(statsList);

    } catch (error) {
      console.error('Error fetching stats:', error);
      setAllStats([]);
      toast.error('통계를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }


  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const getReligionLabel = (type: string) => {
    switch (type) {
      case 'protestant':
        return '기독교';
      case 'catholic':
        return '천주교';
      case 'buddhist':
        return '불교';
      default:
        return type;
    }
  };

  const totalAmount = allStats.reduce((sum, item) => sum + (item?.stats?.totalAmount || 0), 0);
  const totalCount = allStats.reduce((sum, item) => sum + (item?.stats?.totalCount || 0), 0);
  const totalRecurring = allStats.reduce((sum, item) => sum + (item?.stats?.recurringAmount || 0), 0);
  const totalOneTime = allStats.reduce((sum, item) => sum + (item?.stats?.oneTimeAmount || 0), 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Header Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">단체별 통계</h1>
            {`${selectedYear}-${String(selectedMonth).padStart(2, '0')}` < new Date().toISOString().slice(0, 7) ? (
              <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-zinc-800 border-slate-300 text-[10.5px]">
                🔒 마감 집계 완료 (캐시 스토어 직통)
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-300 text-[10.5px]">
                ⚡ 당월 실시간 집계중 (하이브리드 갱신)
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">등록된 단체별 기부금/헌금 통계 및 수단별 집계 현황을 분석합니다.</p>
        </div>
        <div className="flex items-center gap-2">


          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {month}월
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAllStats}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>


      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 매출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalAmount)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalCount}건</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              정기 봉헌
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalRecurring)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              전체의 {totalAmount > 0 ? ((totalRecurring / totalAmount) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              일시 봉헌
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalOneTime)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              전체의 {totalAmount > 0 ? ((totalOneTime / totalAmount) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              활성 단체
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">
                {allStats.filter(s => (s?.stats?.totalCount || 0) > 0).length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              전체 {allStats.length}개 중
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Stats Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>
              {selectedYear}년 {selectedMonth}월 단체별 상세 통계
            </CardTitle>
          </div>
          <CardDescription>각 단체의 봉헌 내역을 확인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allStats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              통계 데이터가 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>단체명</TableHead>
                    <TableHead>종교</TableHead>
                    <TableHead className="text-right">총 매출</TableHead>
                    <TableHead className="text-right">건수</TableHead>
                    <TableHead className="text-right">정기 봉헌</TableHead>
                    <TableHead className="text-right">일시 봉헌</TableHead>
                    <TableHead className="text-right">평균 금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStats
                    .filter(item => item && item.stats)
                    .sort((a, b) => (b.stats?.totalAmount || 0) - (a.stats?.totalAmount || 0))
                    .map((item) => {
                      const avgAmount =
                        (item.stats?.totalCount || 0) > 0
                          ? (item.stats?.totalAmount || 0) / (item.stats?.totalCount || 1)
                          : 0;
                      
                      return (
                        <TableRow key={item.tenant?.id || Math.random()}>
                          <TableCell className="font-semibold">
                            {item.tenant?.name || '단체'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getReligionLabel(item.tenant?.religionType || '')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.stats?.totalAmount || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.stats?.totalCount || 0}건
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {formatCurrency(item.stats?.recurringAmount || 0)}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({item.stats?.recurringCount || 0})
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatCurrency(item.stats?.oneTimeAmount || 0)}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({item.stats?.oneTimeCount || 0})
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(avgAmount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Summary */}
      {allStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Performing Tenants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                상위 단체 (Top 5)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allStats
                  .filter(item => item && item.stats)
                  .sort((a, b) => (b.stats?.totalAmount || 0) - (a.stats?.totalAmount || 0))
                  .slice(0, 5)
                  .map((item, index) => (
                    <div
                      key={item.tenant?.id || index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{item.tenant?.name || '기타 단체'}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.stats?.totalCount || 0}건
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatCurrency(item.stats?.totalAmount || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {totalAmount > 0
                            ? (((item.stats?.totalAmount || 0) / totalAmount) * 100).toFixed(1)
                            : 0}
                          %
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Inactive Tenants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">
                활동 없는 단체
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allStats
                  .filter(item => item && item.stats && (item.stats?.totalCount ?? 0) === 0)
                  .map((item, index) => (
                    <div
                      key={item.tenant?.id || index}
                      className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{item.tenant?.name || '기타 단체'}</p>
                        <Badge variant="outline" className="mt-1">
                          {getReligionLabel(item.tenant?.religionType || '')}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        활동 없음
                      </Badge>
                    </div>
                  ))}
                {allStats.filter(item => item && item.stats && (item.stats?.totalCount ?? 0) === 0).length === 0 && (
                  <p className="text-center text-muted-foreground py-6">
                    모든 단체가 활동 중입니다! 🎉
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}