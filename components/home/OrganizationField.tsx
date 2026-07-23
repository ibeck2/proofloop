import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  type CategoryKey,
  type FieldCluster,
} from "@/lib/home/organizationField";

/**
 * 掲載している団体を「1団体＝1マーク」で描く図。
 *
 * 大学ごとに束ね、分野で濃淡をつける。マークの数は実データそのもので、
 * 装飾のために足したり間引いたりしない。団体が増えれば図も濃くなる。
 *
 * 画像ファイルは使わない。SVGをサーバー側で組み立てるので、
 * 追加のリクエストも権利関係の問題も発生しない。
 */

/** 1列あたりのマーク数。図の高さを決める。小さくするほど横長で目が細かくなる */
const ROWS = 14;
/** 大学名を置く帯の高さ（viewBox の単位） */
const LABEL_BAND = 16;
const LABEL_SIZE = 9;

/**
 * 図の下に置く大学名の略称。
 * 正式名称のままでは狭い列に収まらないため。載っていない大学は正式名称のまま出す
 * （はみ出しはするが、勝手に切り詰めて別の大学に見えるより良い）。
 */
const SHORT_NAMES: Record<string, string> = {
  慶應義塾大学: "慶應",
  上智大学: "上智",
  京都大学: "京大",
  東京大学: "東大",
  一橋大学: "一橋",
  大阪大学: "阪大",
  北海道大学: "北大",
  九州大学: "九大",
  東北大学: "東北",
  名古屋大学: "名大",
  国際基督教大学: "ICU",
  東京科学大学: "科学大",
  早稲田大学: "早稲田",
};
/** マークの一辺 */
const MARK = 3;
/** マークの間隔（マーク＋余白＝CELL） */
const CELL = 5;
/** 大学と大学のあいだ */
const CLUSTER_GAP = 12;

/** 図が現れ始めるまで（ヒーローの4行と少し重ねる） */
const ANIMATION_START = 300;
/** 1列進むごとの遅れ。列数は150前後なので、全体で1秒強になる */
const COLUMN_STEP = 6;

/** 紺の4階調。分野の違いを色相ではなく濃さで表す */
const TONES: Record<CategoryKey, string> = {
  sports: "#002B5C",
  culture: "#33587F",
  academic: "#7391AF",
  other: "#AEBFD0",
};

type Props = {
  clusters: FieldCluster[];
  totalOrganizations: number;
};

export default function OrganizationField({
  clusters,
  totalOrganizations,
}: Props) {
  if (clusters.length === 0) return null;

  let cursorX = 0;
  let columnCursor = 0;

  const groups = clusters.map((cluster) => {
    // マークを1個ずつ矩形で書き出すと、1,958個ぶんのパスでHTMLが250KB増える。
    // 縦一列は等間隔に並ぶので、破線（dasharray）を引いた1本の線で同じ絵になる。
    // 1列＝1本になるので、書き出す量が2桁減る。
    const segments: Array<{ key: CategoryKey; d: string; column: number }> = [];

    let index = 0;
    for (const key of CATEGORY_KEYS) {
      let remaining = cluster.counts[key];
      while (remaining > 0) {
        const column = Math.floor(index / ROWS);
        const row = index % ROWS;
        const run = Math.min(ROWS - row, remaining);

        const x = cursorX + column * CELL + MARK / 2;
        const top = row * CELL;
        const bottom = top + (run - 1) * CELL + MARK;

        segments.push({
          key,
          d: `M${x} ${top}V${bottom}`,
          column: columnCursor + column,
        });

        index += run;
        remaining -= run;
      }
    }

    const columns = Math.ceil(cluster.total / ROWS);
    const labelX = cursorX + (columns * CELL - (CELL - MARK)) / 2;
    const labelColumn = columnCursor + columns - 1;

    cursorX += columns * CELL + CLUSTER_GAP;
    columnCursor += columns;

    return { cluster, segments, labelX, labelColumn };
  });

  /** 左の列から順に現れるまでの間隔。全体で約1秒に収める */
  const delayOf = (column: number) => `${ANIMATION_START + column * COLUMN_STEP}ms`;

  const width = cursorX - CLUSTER_GAP - (CELL - MARK);
  const markHeight = ROWS * CELL - (CELL - MARK);
  const height = markHeight + LABEL_BAND;

  return (
    <figure className="flex flex-col gap-4">
      <svg
        // 端の大学名がマークの列より横に張り出すので、左右に余白を持たせて切れないようにする
        viewBox={`-10 0 ${width + 20} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={`掲載している${totalOrganizations.toLocaleString(
          "ja-JP"
        )}団体を、大学ごとに束ねて分野別に色分けした図`}
      >
        {groups.map(({ cluster, segments, labelX, labelColumn }) => (
          <g key={cluster.university}>
            <title>
              {cluster.university} {cluster.total.toLocaleString("ja-JP")}団体
            </title>
            {segments.map((segment, i) => (
              <path
                key={i}
                className="pl-mark"
                style={{ animationDelay: delayOf(segment.column) }}
                fill="none"
                stroke={TONES[segment.key]}
                strokeWidth={MARK}
                strokeDasharray={`${MARK} ${CELL - MARK}`}
                d={segment.d}
              />
            ))}
            <text
              className="pl-mark"
              style={{ animationDelay: delayOf(labelColumn) }}
              x={labelX}
              y={markHeight + LABEL_SIZE + 3}
              textAnchor="middle"
              fontSize={LABEL_SIZE}
              fill="#5A6875"
            >
              {SHORT_NAMES[cluster.university] ?? cluster.university}
            </text>
          </g>
        ))}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {CATEGORY_KEYS.map((key) => (
          <span
            key={key}
            className="inline-flex items-center gap-2 font-body text-xs text-graphite"
          >
            <span
              aria-hidden="true"
              className="inline-block w-2.5 h-2.5 shrink-0"
              style={{ backgroundColor: TONES[key] }}
            />
            {CATEGORY_LABELS[key]}
          </span>
        ))}
        <span className="font-body text-xs text-graphite/70">
          1つの四角が1団体。左から掲載数の多い大学順。
        </span>
      </figcaption>
    </figure>
  );
}
