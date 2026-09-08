#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 스캔 대상 디렉토리
const TARGET_DIRS = [
  path.join(rootDir, 'src'),
  path.join(rootDir, 'supabase', 'functions')
];

// 검사 제외 대상 확장자 및 경로
const EXCLUDE_EXTENSIONS = new Set(['.json', '.md', '.css', '.svg', '.png', '.jpg', '.webp', '.lock']);
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', '.temp', 'test', '__tests__']);

// 🚨 금지 패턴 목록
const FORBIDDEN_RULES = [
  {
    id: 'TENANT_SLUG_FALLBACK',
    description: '특정 테넌트 슬러그/ID Fallback 주입 금지 (dream, gakwonsa)',
    regex: /\|\|\s*['"`](dream|gakwonsa)['"`]/i,
  },
  {
    id: 'TENANT_SLUG_HARDCODED_EQUALITY',
    description: '특정 테넌트 슬러그 하드코딩 분기 금지 (=== "dream" | "gakwonsa")',
    regex: /(tenantSlug|slug)\s*===\s*['"`](dream|gakwonsa)['"`]/i,
  },
  {
    id: 'DUMMY_PHONE_FALLBACK',
    description: '임의의 가상/테스트 전화번호 Fallback 금지 (|| "010...")',
    regex: /\|\|\s*['"`]010[0-9-]*['"`]/,
  },
  {
    id: 'SPECIFIC_TEST_PHONE_EXPOSURE',
    description: '개발자/특정인 개인 연락처 하드코딩 노출 금지 (01071404795 등)',
    regex: /010-?7140-?4795/,
  },
  {
    id: 'NAME_FALLBACK_DUMMY',
    description: '특정 인명 Fallback 주입 금지 (|| "홍길동...", || "청련")',
    regex: /\|\|\s*['"`](홍길동|청련|각원사\s*봉헌금)['"`]/,
  },
  {
    id: 'AMOUNT_FALLBACK_HARDCODED',
    description: '임의 금액 Fallback 주입 금지 (|| 50000 등)',
    regex: /(amount|total_amount)\s*\|\|\s*50000\b/,
  },
  {
    id: 'LOCAL_URL_HARDCODED',
    description: '로컬호스트 URL 하드코딩 금지 (http://localhost, http://127.0.0.1)',
    regex: /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/,
  },
  {
    id: 'DUMMY_BANK_OR_BIZNO',
    description: '가상 계좌번호 또는 임의 사업자번호 하드코딩 금지',
    regex: /('100-032-456789'|'1208200000')/,
  },
  {
    id: 'DUMMY_DONOR_EMAIL_FALLBACK',
    description: '임의의 가상 신도/기부자 이메일 Fallback 금지 (donator@soulpay.kr 등)',
    regex: /['"`]donator@soulpay\.kr['"`]/,
  }
];

let totalViolations = 0;
const violationList = [];

function scanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (EXCLUDE_EXTENSIONS.has(ext)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // 주석 라인 및 검사 제외 주석 건너뛰기
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (trimmed.includes('hardcoding-exempt')) return;

    // UI Input의 placeholder 속성에 들어간 예시 값은 제외
    const lineWithoutPlaceholders = line.replace(/placeholder\s*=\s*["'][^"']*["']/g, '');

    for (const rule of FORBIDDEN_RULES) {
      if (rule.regex.test(lineWithoutPlaceholders)) {
        totalViolations++;
        violationList.push({
          file: path.relative(rootDir, filePath),
          lineNum: index + 1,
          ruleId: rule.id,
          description: rule.description,
          content: trimmed,
        });
      }
    }
  });
}

function traverseDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      traverseDirectory(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

console.log('\n🔍 [Zero-Hardcoding Guard] SoulPay 코드베이스 무결성 정적 검사를 시작합니다...');

for (const dir of TARGET_DIRS) {
  traverseDirectory(dir);
}

if (totalViolations === 0) {
  console.log('✅ [Pass] 하드코딩 및 금지된 Fallback 데이터가 0건입니다. 상용 배포에 적합합니다.\n');
  process.exit(0);
} else {
  console.error(`\n❌ [Fail] 총 ${totalViolations}건의 하드코딩/Fallback 위반 사항이 발견되었습니다:\n`);
  
  violationList.forEach((v, idx) => {
    console.error(`[${idx + 1}] ${v.file}:${v.lineNum}`);
    console.error(`    규칙: ${v.ruleId} (${v.description})`);
    console.error(`    코드: ${v.content}\n`);
  });

  console.error('🚫 빌드가 중단되었습니다. 하드코딩된 Fallback 값을 제거하거나 dataGuards 유틸리티를 사용하세요.\n');
  process.exit(1);
}
