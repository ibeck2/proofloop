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
  const baseName = normalized.split("/").pop() ?? "";
  if (!/^\.env(\..+)?$/.test(baseName)) {
    process.exit(0);
  }

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason:
          `${filePath} は秘密情報（APIキー・Supabaseキー等）を含む可能性のあるファイルです。` +
          `値をチャット上に出力しないよう注意し、本当に編集が必要か確認してください。`,
      },
    })
  );
});
