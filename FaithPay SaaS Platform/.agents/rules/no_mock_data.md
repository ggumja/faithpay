# Custom Rule: Strict Direct Database Querying Policy (No Mock Data)

## Core Directive
- **Strict Prohibition of Mock / Virtual Data**: Never use hardcoded mock objects, fallback sample arrays, or simulated dummy numbers when displaying UI components, dashboards, reports, or lists.
- **Mandatory Real Database Integration**: All UI components, dashboards, metrics, and lists must fetch and display actual live data directly from the Supabase database / backend APIs (`db` / `client.ts` / REST endpoints).
- **Zero Record Handling**: If no actual records exist in the database, the system must accurately display `0`, `0원`, `0건`, or an empty list state ("등록된 내역이 없습니다") rather than falling back to fake sample numbers.
