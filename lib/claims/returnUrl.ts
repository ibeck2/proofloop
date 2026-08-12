/**
 * `/claim/[token]` からログイン・新規登録へ離脱した後、同じページへ戻るための
 * sessionStorage キー。3箇所（claim/[token]・login・signup）で同じ文字列を
 * 直接ベタ書きすると、綴りがずれた瞬間に戻れなくなる不具合が気づかれにくい形で起きる。
 */
export const CLAIM_RETURN_KEY = "proofloop.claim.returnTo";
