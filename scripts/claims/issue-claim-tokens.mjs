/**
 * 掲載通知バッチ用の claim トークンを発行する SQL を生成する。
 *
 *   node scripts/claims/issue-claim-tokens.mjs <バッチ番号>
 *
 * 出力された SQL を Supabase MCP の execute_sql で実行し、
 * 返ってきた token を docs/models/claim-tokens-batch<N>.csv に保存して
 * DM送信オペレーションで使う。
 *
 * 対象は「専有チャネルを持つ団体」だけ。共有ハンドルの団体は
 * 誰に届くか保証できないので発行しない（設計 §2.2）。
 *
 * ⚠️ organization_claims への INSERT は anon キーでは実行できない
 * （SELECTポリシーが無い＝出入口はRPCのみ、028/029参照）。
 * このスクリプトはSQLを生成するだけで、実行はしない。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "..", "..");
const BATCH = Number(process.argv[2] ?? 1);

const EXPIRES_DAYS = 90; // 第1バッチの実測を見て調整する

// 優先順位リスト（build-org-outreach-list.mjs が出力したもの）を読む
const csv = readFileSync(
  path.join(ROOT, "docs", "models", "団体_声かけ優先順位.csv"),
  "utf8"
).replace(/^﻿/, "");

const [head, ...lines] = csv.trim().split(/\r?\n/);
const cols = head.split(",");
const iBatch = cols.indexOf("バッチ");
const iId = cols.indexOf("団体ID");
const iChannel = cols.indexOf("主チャネル");
const iHandle = cols.indexOf("主ハンドル");

if (iChannel < 0 || iHandle < 0) {
  console.error("主チャネル列がありません。先に build-org-outreach-list.mjs を実行してください");
  process.exit(1);
}

/** 引用符を含みうるCSV行を素直に分解する */
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const targets = lines
  .map(splitCsvLine)
  .filter((c) => Number(c[iBatch]) === BATCH && c[iChannel] && c[iId]);

if (targets.length === 0) {
  console.error(`バッチ${BATCH}の対象が0件です`);
  process.exit(1);
}

const values = targets
  .map((c) => {
    const id = c[iId].replace(/'/g, "''");
    const ch = c[iChannel].replace(/'/g, "''");
    const h = c[iHandle].replace(/'/g, "''");
    return `  ('${id}'::uuid, '${ch}', '${h}', true, now() + interval '${EXPIRES_DAYS} days')`;
  })
  .join(",\n");

const sql = `-- 掲載通知 第${BATCH}バッチ: claim トークン発行（${targets.length}件）
-- 生成: scripts/claims/issue-claim-tokens.mjs
INSERT INTO public.organization_claims
  (organization_id, channel, channel_handle, channel_is_unique, expires_at)
VALUES
${values}
RETURNING organization_id, channel, channel_handle, token;
`;

const out = path.join(ROOT, "docs", "models", `claim-tokens-batch${BATCH}.sql`);
writeFileSync(out, sql, "utf8");
console.log("wrote:", out);
console.log(`対象 ${targets.length} 件 / 有効期限 ${EXPIRES_DAYS}日`);
