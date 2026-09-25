import "server-only";
import { JWT } from "google-auth-library";

// 시트를 다시 읽는 주기(초). 그 사이에는 캐시된 값을 사용
const REVALIDATE_SECONDS = 300;

export type Cell = string | number | boolean | undefined;

const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

async function sheetsGet<T>(spreadsheetId: string, path: string): Promise<T> {
  const { token } = await auth.getAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`스프레드시트 읽기 실패 (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

// 한 범위를 화면에 보이는 글자 그대로(행 단위) 읽기
export async function readValues(spreadsheetId: string, range: string): Promise<string[][]> {
  const data = await sheetsGet<{ values?: string[][] }>(spreadsheetId, `values/${encodeURIComponent(range)}`);
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
