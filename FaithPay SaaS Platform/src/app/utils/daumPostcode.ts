export interface PostcodeResult {
  address: string;
  zonecode: string;
  buildingName: string;
}

/**
 * 카카오/다음 우편번호 검색 API 동적 로더 및 팝업 오픈 헬퍼
 */
export function openDaumPostcode(onComplete: (data: PostcodeResult) => void) {
  const scriptId = 'daum_postcode_script';
  let script = document.getElementById(scriptId) as HTMLScriptElement;

  const launch = () => {
    if ((window as any).daum && (window as any).daum.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          let fullAddress = data.roadAddress || data.jibunAddress;
          let extraAddress = '';

          if (data.bname !== '') extraAddress += data.bname;
          if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
          if (extraAddress !== '') fullAddress += ` (${extraAddress})`;

          onComplete({
            address: fullAddress,
            zonecode: data.zonecode,
            buildingName: data.buildingName,
          });
        },
      }).open();
    }
  };

  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = launch;
    document.body.appendChild(script);
  } else {
    launch();
  }
}
