import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TenantBannerCarouselProps {
  bannerImages?: string[];
  tenantName: string;
}

export function TenantBannerCarousel({ bannerImages = [], tenantName }: TenantBannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!bannerImages || bannerImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [bannerImages]);

  if (!bannerImages || bannerImages.length === 0) {
    return null;
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + bannerImages.length) % bannerImages.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % bannerImages.length);
  };

  return (
    <div style={{
      maxWidth: 1100,
      margin: '24px auto 0',
      padding: '0 16px',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(180px, 30vw, 360px)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 30px oklch(0.12 0.015 260 / 0.12)',
        border: '1px solid oklch(0.12 0.015 260 / 0.08)',
        background: '#111',
      }}>
        {/* Images */}
        {bannerImages.map((src, index) => (
          <div
            key={`${src}-${index}`}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: index === currentIndex ? 1 : 0,
              transition: 'opacity 600ms ease-in-out',
              pointerEvents: index === currentIndex ? 'auto' : 'none',
            }}
          >
            <img
              src={src}
              alt={`${tenantName} 배너 ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        ))}

        {/* Prev / Next controls */}
        {bannerImages.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="이전 배너"
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                transition: 'background 150ms',
                zIndex: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              aria-label="다음 배너"
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                transition: 'background 150ms',
                zIndex: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
            >
              <ChevronRight size={20} />
            </button>

            {/* Pagination dots */}
            <div style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 6,
              zIndex: 2,
              background: 'rgba(0,0,0,0.3)',
              padding: '4px 10px',
              borderRadius: 20,
              backdropFilter: 'blur(4px)',
            }}>
              {bannerImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`${i + 1}번 배너 이동`}
                  style={{
                    width: i === currentIndex ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === currentIndex ? 'white' : 'rgba(255,255,255,0.5)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 200ms',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
