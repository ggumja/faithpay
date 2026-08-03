import { Building2, Plus, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

interface PartnerTenantsSectionProps {
  myTenants: any[];
}

export function PartnerTenantsSection({ myTenants }: PartnerTenantsSectionProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-slate-800">관리 단체 목록</h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5">내가 유치하거나 관할하는 사찰 · 교회 가맹점 현황</p>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          onClick={() => navigate('/partner/tenants/new')}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> 신규 가맹점 개설
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {myTenants.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-500 text-sm">등록된 관리 단체가 없습니다.</p>
              <p className="text-slate-400 mt-1">가맹점 등록 초대 링크나 신규 개설 버튼을 사용하여 단체를 추가하세요.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myTenants.map((t: any) => (
                <div key={t.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-800 font-bold flex items-center justify-center text-sm border border-purple-100 shrink-0">
                      {t.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 text-[14px]">{t.name}</p>
                        <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                          {t.status === 'active' ? '운영중' : '승인대기'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        도메인: faithpay.kr/{t.slug} · 종교: {t.religionType === 'buddhist' ? '불교' : t.religionType === 'catholic' ? '천주교' : '기독교'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-2 hidden sm:block">
                      <span className="text-[11px] text-slate-400 block">계약 수수료율</span>
                      <span className="text-[13px] font-bold text-emerald-700 font-mono">
                        {(t as any).contractRate ?? 3.0}%
                      </span>
                    </div>
                    <a
                      href={`/g/${t.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      페이지 이동 <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
