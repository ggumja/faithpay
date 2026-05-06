import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp, mockTenants, mockDonationItems } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Heart, Calendar, Sparkles, MapPin, Phone, Mail, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

export default function TenantHome() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, setCurrentTenant]);

  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const donationItems = mockDonationItems[currentTenant.religionType] || [];

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    beforeChange: (_: number, next: number) => setCurrentSlide(next),
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation Bar */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/${tenantSlug}/my-donations`)}
              className="text-slate-600"
            >
              내 내역
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/${tenantSlug}/donate`)}
              style={{ borderColor: currentTenant.primaryColor, color: currentTenant.primaryColor }}
            >
              <Heart className="h-4 w-4 mr-2" />
              {currentTenant.terminology.donation}하기
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section with Logo and Banner Slider */}
      <div className="relative">
        <Slider {...sliderSettings}>
          {currentTenant.bannerImages.map((image, index) => (
            <div key={index} className="relative h-[500px]">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
              </div>
            </div>
          ))}
        </Slider>

        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 pointer-events-none">
          {currentTenant.logoUrl && (
            <div className="mb-6">
              <img
                src={currentTenant.logoUrl}
                alt={`${currentTenant.name} 로고`}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl"
              />
            </div>
          )}
          <h1 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">
            {currentTenant.name}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 drop-shadow-md">
            {currentTenant.description}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* About Section */}
        <div className="mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">소개</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {currentTenant.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" style={{ color: currentTenant.primaryColor }} />
                    연락처
                  </h3>
                  <div className="space-y-2 text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                      <span>{currentTenant.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{currentTenant.contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span>{currentTenant.contact.email}</span>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" style={{ color: currentTenant.primaryColor }} />
                    {currentTenant.religionType === 'protestant' && '예배 시간'}
                    {currentTenant.religionType === 'buddhist' && '법회 시간'}
                    {currentTenant.religionType === 'catholic' && '미사 시간'}
                  </h3>
                  <div className="space-y-2">
                    {currentTenant.schedule.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 rounded bg-slate-50"
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donation Items Section */}
        <div className="mb-16">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold mb-3">
              {currentTenant.terminology.donation} 안내
            </h2>
            <p className="text-muted-foreground text-lg">
              원하시는 {currentTenant.terminology.donation} 항목을 선택해주세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {donationItems.map((item) => (
              <Card
                key={item.id}
                className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary group"
                onClick={() =>
                  navigate(`/${tenantSlug}/donate`, {
                    state: { selectedItem: item },
                  })
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                        {item.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {item.description}
                      </CardDescription>
                    </div>
                    <div
                      className="p-3 rounded-full transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${currentTenant.primaryColor}20` }}
                    >
                      <Heart
                        className="h-6 w-6"
                        style={{ color: currentTenant.primaryColor }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.allowOneTime && (
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        단발
                      </Badge>
                    )}
                    {item.allowRecurring && (
                      <Badge variant="secondary" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        정기
                      </Badge>
                    )}
                    {item.amountType === 'fixed' && item.fixedAmount && (
                      <Badge
                        variant="outline"
                        style={{ borderColor: currentTenant.primaryColor }}
                      >
                        {item.fixedAmount.toLocaleString()}원
                      </Badge>
                    )}
                    {item.amountType === 'flexible' && (
                      <Badge variant="outline">자율 금액</Badge>
                    )}
                  </div>
                  <Button
                    className="w-full group-hover:shadow-md transition-shadow"
                    style={{ backgroundColor: currentTenant.primaryColor }}
                  >
                    선택하기
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">안전하고 투명한 {currentTenant.terminology.donation}</CardTitle>
            <CardDescription className="text-base">
              FaithPay가 제공하는 안전한 온라인 {currentTenant.terminology.donation} 시스템입니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-start gap-3 p-4 bg-white rounded-lg">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: currentTenant.primaryColor }}
                >
                  1
                </div>
                <div>
                  <p className="font-semibold text-lg mb-1">간편한 결제</p>
                  <p className="text-sm text-muted-foreground">
                    신용카드, 간편결제, 가상계좌 등 다양한 결제 수단을 지원합니다
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 p-4 bg-white rounded-lg">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: currentTenant.primaryColor }}
                >
                  2
                </div>
                <div>
                  <p className="font-semibold text-lg mb-1">투명한 관리</p>
                  <p className="text-sm text-muted-foreground">
                    모든 거래 내역이 실시간으로 기록되고 투명하게 관리됩니다
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 p-4 bg-white rounded-lg">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: currentTenant.primaryColor }}
                >
                  3
                </div>
                <div>
                  <p className="font-semibold text-lg mb-1">디지털 영수증</p>
                  <p className="text-sm text-muted-foreground">
                    즉시 발급되는 디지털 영수증과 카카오톡 알림을 받으실 수 있습니다
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-white py-12">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">{currentTenant.name}</h3>
              <div className="space-y-2 text-slate-300">
                <p>{currentTenant.address}</p>
                <p>{currentTenant.contact.phone}</p>
                <p>{currentTenant.contact.email}</p>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">FaithPay</h3>
              <p className="text-slate-300">
                종교 통합 봉헌 플랫폼
              </p>
              <p className="text-slate-400 text-sm mt-2">
                © 2026 FaithPay. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Arrow Components for Slider
function CustomPrevArrow(props: any) {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all"
    >
      <ChevronLeft className="h-6 w-6 text-slate-800" />
    </button>
  );
}

function CustomNextArrow(props: any) {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all"
    >
      <ChevronRight className="h-6 w-6 text-slate-800" />
    </button>
  );
}