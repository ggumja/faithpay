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
import { projectId, publicAnonKey } from '/utils/supabase/info';

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
        `https://${projectId}.supabase.co/functions/v1/make-server-d0d82cc7/stats/all/${selectedYear}/${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const result = await response.json();
      console.log('Stats API response:', result);
      
      if (result.success) {
        // 배열인 경우 그대로 사용, 단일 객체인 경우 빈 배열 설정
        if (Array.isArray(result.data)) {
          setAllStats(result.data);
        } else {
          // 단일 통계 객체가 반환된 경우 (전체 통계용)
          console.warn('Expected array but got single object:', result.data);
          setAllStats([]);
        }
      } else {
        console.error('Invalid stats data:', result);
        setAllStats([]);
        toast.error('통계 데이터 형식이 올바르지 않습니다');
      }
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

  const totalAmount = allStats.reduce((sum, item) => sum + item.stats.totalAmount, 0);
  const totalCount = allStats.reduce((sum, item) => sum + item.stats.totalCount, 0);
  const totalRecurring = allStats.reduce((sum, item) => sum + item.stats.recurringAmount, 0);
  const totalOneTime = allStats.reduce((sum, item) => sum + item.stats.oneTimeAmount, 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Header with Date Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            단체별 매출 통계
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            전체 단체의 봉헌 통계를 확인하세요
          </p>
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
                {allStats.filter(s => s.stats.totalCount > 0).length}
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
                    .sort((a, b) => b.stats.totalAmount - a.stats.totalAmount)
                    .map((item) => {
                      const avgAmount =
                        item.stats.totalCount > 0
                          ? item.stats.totalAmount / item.stats.totalCount
                          : 0;
                      
                      return (
                        <TableRow key={item.tenant.id}>
                          <TableCell className="font-semibold">
                            {item.tenant.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getReligionLabel(item.tenant.religionType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.stats.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.stats.totalCount}건
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {formatCurrency(item.stats.recurringAmount)}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({item.stats.recurringCount})
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatCurrency(item.stats.oneTimeAmount)}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({item.stats.oneTimeCount})
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
                  .sort((a, b) => b.stats.totalAmount - a.stats.totalAmount)
                  .slice(0, 5)
                  .map((item, index) => (
                    <div
                      key={item.tenant.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{item.tenant.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.stats.totalCount}건
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatCurrency(item.stats.totalAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {totalAmount > 0
                            ? ((item.stats.totalAmount / totalAmount) * 100).toFixed(1)
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
                  .filter(item => item.stats.totalCount === 0)
                  .map((item) => (
                    <div
                      key={item.tenant.id}
                      className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{item.tenant.name}</p>
                        <Badge variant="outline" className="mt-1">
                          {getReligionLabel(item.tenant.religionType)}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        활동 없음
                      </Badge>
                    </div>
                  ))}
                {allStats.filter(item => item.stats.totalCount === 0).length === 0 && (
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