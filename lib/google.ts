import "server-only";
import { JWT } from "google-auth-library";

// 시트를 다시 읽는 주기(초). 그 사이에는 캐시된 값을 사용
const REVALIDATE_SECONDS = 300;

export type Cell = string | number | boolean | undefined;

const credentials = {
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};
// 데이터 시트는 읽기 전용 권한으로만 접근
const auth = new JWT({ ...credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
// 쓰기 권한은 접속 기록 시트에만 사용
const writeAuth = new JWT({ ...credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });

async function sheetsGet<T>(spreadsheetId: string, path: string, revalidate = REVALIDATE_SECONDS): Promise<T> {
  const { token } = await auth.getAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`스프레드시트 읽기 실패 (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

// 한 범위를 화면에 보이는 글자 그대로(행 단위) 읽기. revalidate: 캐시 유지 시간(초)
export async function readValues(spreadsheetId: string, range: string, revalidate?: number): Promise<string[][]> {
  const data = await sheetsGet<{ values?: string[][] }>(spreadsheetId, `values/${encodeURIComponent(range)}`, revalidate);
  return data.values ?? [];
}

// 여러 범위를 한 번에 열(column) 단위로 읽기.
// 날짜는 시트 내부 숫자(1899-12-30부터 센 일수), 체크박스는 true/false로 옴
export async function readColumns(spreadsheetId: string, ranges: string[]): Promise<Cell[][][]> {
  const query = [
    ...ranges.map((r) => `ranges=${encodeURIComponent(r)}`),
    "majorDimension=COLUMNS",
    "valueRenderOption=UNFORMATTED_VALUE",
    "dateTimeRenderOption=SERIAL_NUMBER",
  ].join("&");
  const data = await sheetsGet<{ valueRanges: { values?: Cell[][] }[] }>(spreadsheetId, `values:batchGet?${query}`);
  return data.valueRanges.map((r) => r.values ?? []);
}

// ── 접속 기록 시트 전용 (쓰기 권한) ──────────────────────────
// 캐시 없이 최신 값 읽기
export async function readValuesFresh(spreadsheetId: string, range: string): Promise<string[][]> {
  const { token } = await writeAuth.getAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`스프레드시트 읽기 실패 (${res.status}): ${await res.text()}`);
  const data: { values?: string[][] } = await res.json();
  return data.values ?? [];
}

// 행 추가. valueInputOption=RAW: 입력값을 수식으로 해석하지 않음 ("="로 시작해도 안전)
export async function appendRows(spreadsheetId: string, range: string, rows: string[][]) {
  const { token } = await writeAuth.getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: rows }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`스프레드시트 쓰기 실패 (${res.status}): ${await res.text()}`);
}
