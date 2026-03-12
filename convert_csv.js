const fs = require('fs');
const path = require('path');
const Papa = require('papaparse'); // プロ仕様のCSVパーサー

const INPUT_DIR = './raw_csvs';
const OUTPUT_FILE = 'all_import_ready.csv';

function guessCategory(name) {
  if (/[部球技走泳陸山応援武]/.test(name) || name.includes('スポーツ') || name.includes('自転車')) return '運動系（スポーツ・アウトドア）';
  if (/[音楽吹奏合唱演劇美術アート看]/.test(name) || name.includes('バンド')) return '文化系（音楽・演劇・アート）';
  if (/[ゼミ研究勉強学術]/.test(name)) return '学術・研究（ゼミ・研究会・勉強会）';
  if (name.includes('起業') || name.includes('就活') || name.includes('ビジネス')) return 'ビジネス・キャリア（起業・就活）';
  if (name.includes('国際') || name.includes('語学')) return '国際交流・語学';
  if (name.includes('ボランティア') || name.includes('NPO')) return 'ボランティア・NPO';
  if (name.includes('実行委員') || name.includes('インカレ') || name.includes('イベント')) return 'イベント・企画（インカレ・学園祭等）';
  if (name.includes('出版') || name.includes('放送') || name.includes('メディア')) return 'メディア・出版';
  return '趣味・その他';
}

function extractId(url) {
  if (!url) return '';
  const match = url.match(/(?:twitter\.com|x\.com|instagram\.com)\/([^/?]+)/);
  return match ? `@${match[1]}` : url;
}

try {
  const headers = ['name', 'university', 'category', 'description', 'x_id', 'instagram_id', 'line_url', 'website_url', 'member_count', 'activity_frequency', 'logo_url', 'is_verified'];
  let outputRows = [headers];

  const files = fs.readdirSync(INPUT_DIR).filter(file => file.endsWith('.csv'));
  console.log(`📂 ${files.length}個のCSVファイルを見つけました。処理を開始します...`);

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    const csvString = fs.readFileSync(filePath, 'utf-8');

    // PapaParseで安全に読み込み（カンマや改行の誤爆を防ぐ）
    const parsed = Papa.parse(csvString, { header: false, skipEmptyLines: true });
    const rows = parsed.data;

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      if (!Array.isArray(cols) || cols.length < 2) continue;

      let cleanName = cols[1] ? String(cols[1]).split('/')[0].trim().replace(/\n/g, '') : '';

      const rowData = [
        cleanName,                             // name
        cols[0] || '',                         // university
        guessCategory(cleanName),              // category
        cols[18] || '',                        // description
        extractId(cols[7]),                    // x_id
        extractId(cols[8]),                    // instagram_id
        cols[9] || '',                         // line_url
        cols[10] || '',                        // website_url
        cols[29] || '',                        // member_count
        cols[24] || '',                        // activity_frequency
        '',                                    // logo_url
        'FALSE'                                // is_verified
      ];
      outputRows.push(rowData);
    }
    console.log(`✅ ${file} の処理が完了しました。`);
  }

  // PapaParseで安全にCSV出力（必要な箇所だけ自動で""で囲んでくれる）
  const finalCsv = Papa.unparse(outputRows);
  fs.writeFileSync(OUTPUT_FILE, finalCsv, 'utf-8');
  console.log(`\n🎉 全ての変換が完了しました！ ${OUTPUT_FILE} が作成されました。`);

} catch (err) {
  console.error('エラーが発生しました:', err);
}
