-- 055: task_commentsのbodyに長さ制約を追加
--
-- コメントは編集・削除が一切できない設計のため、空文字や巨大なblobが
-- 一度でも投稿されると、テーブルレベルでは永久に是正できない
-- （author_idの誤属性を054で塞いだのと同じ理由）。クライアント側の
-- trim+空文字チェックだけでは、REST経由の直接呼び出しや将来の
-- 別実装を防げない。テーブルがまだ0件のうちに制約を足す。

ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_body_length
  CHECK (char_length(btrim(body)) BETWEEN 1 AND 10000);
