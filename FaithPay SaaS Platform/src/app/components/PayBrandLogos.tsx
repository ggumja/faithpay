import React from 'react';

// 1. 카카오페이 (Kakao Pay) 브랜드 로고
export function KakaoPayLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FEE500] text-[#3C1E1E] font-black text-xs tracking-tight shadow-2xs border border-[#FBC02D]/40 ${className}`}>
      <span className="font-extrabold text-[11px] font-sans">kakao</span>
      <span className="font-black text-[12px] font-sans -ml-0.5">pay</span>
    </div>
  );
}

// 2. 네이버페이 (Naver Pay) 브랜드 로고
export function NaverPayLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#03CF5D] text-white font-black text-xs tracking-tight shadow-2xs border border-[#02b350]/40 ${className}`}>
      <span className="bg-white text-[#03CF5D] w-3.5 h-3.5 rounded-xs flex items-center justify-center font-black text-[10px] leading-none">N</span>
      <span className="font-black text-[11px] font-sans">Pay</span>
    </div>
  );
}

// 3. 토스페이 (Toss Pay) 브랜드 로고
export function TossPayLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0050FF] text-white font-black text-xs tracking-tight shadow-2xs border border-[#0040D0]/40 ${className}`}>
      <span className="font-black text-[12px] font-sans italic tracking-tighter">toss</span>
      <span className="font-bold text-[11px] font-sans opacity-90">pay</span>
    </div>
  );
}
