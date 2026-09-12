/* 환경변수에서 Supabase 키를 주입받습니다. .env.local 파일을 확인하세요. */

export const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID as string
  ?? "aoognbmkstgrytkqsexy"; // fallback: Vercel/CI 환경변수 미설정 시
export const publicAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string
  ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvb2duYm1rc3Rncnl0a3FzZXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTEwOTMsImV4cCI6MjA5MDI2NzA5M30.Rw24CPhXe6S6K0wARFI4QWq7x3YT1mdxltjkhwYBB2E";