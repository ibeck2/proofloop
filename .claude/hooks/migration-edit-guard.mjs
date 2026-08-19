import { execSync } from "node:child_process";

let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const filePath = data?.tool_input?.file_path;
  if (!filePath) process.exit(0);

  const normalized = filePath.replace(/\\/g, "/");
  if (!/(^|\/)supabase\/migrations\/[^/]+\.sql$/.test(normalized)) {
    process.exit(0);
  }

  let tracked = false;
  try {
    execSync(`git ls-files --error-unmatch -- "${filePath}"`, {
      stdio: ["ignore", "ignore", "ignore"],
    });
    tracked = true;
  } catch {
    tracked = false;
  }

  if (!tracked) {
    // 新規・未コミットのファイル = 下書き中。警告不要。
    process.exit(0);
  }

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason:
          `${filePath} は既にgitでコミット済みのマイグレーションファイルです。` +
          `本番に適用済みの可能性があります。CLAUDE.mdの方針では、適用済みマイグレーションは書き換えず、` +
          `新しい番号のマイグレーションで対処します。このファイルを本当に編集しますか？` +
          `（未適用と分かっている下書きの手直しなら問題ありません）`,
      },
    })
  );
});
