/**
 * Supabase 連携前のテスト用モックデータ
 */

export type ScaleKey = "50未満" | "50-100" | "100以上";

export type Club = {
  id: string;
  name: string;
  university: string;
  category: string;
  scale: ScaleKey;
  memberCount: number;
  image: string;
  imageAlt: string;
  tags: string[];
  proofScore: number;
};

export const MOCK_CLUBS: Club[] = [
  {
    id: "1",
    name: "硬式テニスサークル",
    university: "東京大学",
    category: "スポーツ",
    scale: "50未満",
    memberCount: 45,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBTimTIQmyKCwlPZegLZRrIHto9T15aPYkzoUF-J5FrRzsVOInHTNrp3jFmSLHInhLjC7C1lnIxLW35XA9ELRvintmfnxBJCflDSald1_9wnmnWopLGmxbT_1XPoVuXa8WhtzLqJ7guZg1nAHhqprXaE9hyn_HTUTJn3xapGp_FmB6S9fMJpqpEe0iAfkam8X7QXQOtBE3F_AeyVISBJyhFjtpQPYeP8ghcQ1bzKFE8FrU1JNFDhQTbsQ19IUluanKG02DQiGo-pJY",
    imageAlt: "Modern university campus tennis court outdoors",
    tags: ["テニス", "体育会", "大会出場"],
    proofScore: 72,
  },
  {
    id: "2",
    name: "放送研究会",
    university: "早稲田大学",
    category: "音楽",
    scale: "100以上",
    memberCount: 120,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBRK9Gaz44knQpvf3-tdvZABP_JiB0vOIfYGiYhdn3VXmxAYYbDTSLM7Ga2O4k9tbmjw4FJWF0TNeMDM2_2bZlR1eIVOZcIk9RhAtr5y76fa1-ls4iSERuH4gRRAaI8wU9K0rQX197ck_tjDEKu7At_Kdtu-V2i6Tw6eIIehz0pZ8tScbiTURQukxf5fr8sagpVwEoRH8VHTNs1Vp4bEWrWku30xR93RoJll5iLaMYEzOBb-WEWAinkc6YogduUDoYSC4AtiWfVL_M",
    imageAlt: "Professional studio microphone and headphones setup",
    tags: ["ラジオ", "音響", "イベント運営"],
    proofScore: 88,
  },
  {
    id: "3",
    name: "マーケティング研究会",
    university: "慶應義塾大学",
    category: "文化学術",
    scale: "50-100",
    memberCount: 60,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA6nW71C66W4CdqFR5DcZKDrt2MBf-bv3yKOcqLBN4oAbk30_Gc7RbIHTxegOKb23bzWIH4dNSut8evp1mpXtnN7JbpC5zK5ITowPHY5TTcb0P_fyXkgxsQax7dWOCxKGyhwTOvr8_AYC376geYftGDiYPFyQREnIG7opsJbkpLxhinh0gZPrtzSJz_xzTrNecjDqIbfimiTpEsRTU4yjYZQpt1LFx49cDsZIv8jJl3O9oSD50FTGT7gFyH_StBEz8E-j_M5fajT6o",
    imageAlt: "Group of students collaborating around table",
    tags: ["ビジネス", "企業連携", "ケーススタディ"],
    proofScore: 91,
  },
  {
    id: "4",
    name: "フットサル同好会",
    university: "明治大学",
    category: "スポーツ",
    scale: "50-100",
    memberCount: 85,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAPt4o308izJQcIqHynNoMa_Ms3qynu73HJEy1BbDZAAK7XtJtVe86Dl3JNB_PL6JA7X3sIh5wO4v87aJjGsjSl74IM5lHiNct_6UoJlpaxHhe7-bNRc8bZLM2OkZi7wj9ud-MtuYcugcdQzEZhNy2eihIAwVO-kNoW9jOQc6Go5XK50KgYcaYSCscrDD98NiC2-puN7jy37vWJjKonShb16GqyTG9aXEooVPp0w4Ld5FMEIqgaGpd5wEZoHJ9NkCokgxJQsyxC_Ds",
    imageAlt: "Students playing soccer on grass field",
    tags: ["フットサル", "サッカー", "週末活動"],
    proofScore: 65,
  },
  {
    id: "5",
    name: "管弦楽団",
    university: "東京大学",
    category: "音楽",
    scale: "100以上",
    memberCount: 150,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9gF3DG_MvmuNMr9mYSMUdHhcH0klJSUAC2iDviMEiHVm7FitATbNbk4WjffZGEfReHdeqlvyxUFF8gWEsNSjcuDAohF_yeX6AGzOdNgP0amlVGrSwvIoPcTIBRD-S_0mnojbJLIKHv_x9UGPiMiG0ncXe2oW2r2-dGSL5Kauu9YWhnVc9R0kMag9hqY4MAzsebsX_7_zY0jqK4D_xfeaekXyOLgZYJtDCk9elE4FLtu9s3MXn6UAq4y5-gkydH5Mb5P2tSBwYJXo",
    imageAlt: "Close up of musical instruments violin",
    tags: ["オーケストラ", "クラシック", "定期演奏会"],
    proofScore: 95,
  },
  {
    id: "6",
    name: "地域活性プロジェクト",
    university: "早稲田大学",
    category: "ボランティア",
    scale: "50未満",
    memberCount: 30,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAJc6omZI1jy6HG6gALz_UUj2a_XGeCQyjPxm9q_Bay1-SuoxS0GL5umkOXs94MXc3PamsPQzkGdPRMM3Xtx4OwYTXXdCdX4aIPlrsLlxjt4PekPWCesQp7z6ROI5Yv_9ym9ZWI3jCbPA9TRxDFmuWxa6N18EmH47EHV2Ys0iDepL3VAS-zSCgLIn4oG9IdWifkjW7zCfKCtIPaUJA6E6EkFxqRErPfHSKkjALGMyB8dNOJBeMTCBX0P01gcxBRQ4GEdd9xGgZJQrk",
    imageAlt: "Volunteers helping in community garden",
    tags: ["地域貢献", "NPO", "フィールドワーク"],
    proofScore: 78,
  },
  {
    id: "7",
    name: "国際交流サークル",
    university: "東京大学",
    category: "文化学術",
    scale: "50-100",
    memberCount: 55,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBSTKC4oFDJih5T7vGHyyrUw1IDzmGHEfKNJW7-0V9r9YnlXK-RE2iulBDZ7IVc9yAqOz6ypj2V36xayoqLBPPBQcTTmgYuxpnJc5xcvflK69km4OBfVE-uaah-Ep-ojfmE1ySWht5vKmPfDn_iaAPhFD7D7I3F1dPdmih9Sqq6Z6f9yvMpRKmD1KpCBZ_e5h2Pfp_8_SlVaKe8q5aFo8h0ewsfEDOi2dt476sCJMY1-2ZFLs3TBBxC_SkzvCohHhqpmcvvD291K6c",
    imageAlt: "University campus students gathering",
    tags: ["国際", "留学生", "語学"],
    proofScore: 82,
  },
  {
    id: "8",
    name: "写真部",
    university: "明治大学",
    category: "文化学術",
    scale: "50未満",
    memberCount: 28,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDvQjBg-Uu5dcRVw3YdBbCPqYgofgQ7pomqDbCcA_sq10sfrWapMOg0_ZBKbv_2jVexckzjl-QNl4htGsBHcz9FNc5LVSYBdK6Y2CMpTIMT8jxgc9l1JXTdxz43_BvBueYuraIhtdSSwhE5z0kHnJysL-0sG73GTwZdvnsmgJfZTL_cp8dtMRMJxjGEO8qJXxid0At82icVG1aQmbmGTKHRZVB8vkIA2Cl6KZEPdF0mhsOTX-_RC3fG2mcxTqUGwBJImLPkkAtgE9A",
    imageAlt: "Students collaborating in a seminar room",
    tags: ["写真", "展示", "撮影会"],
    proofScore: 70,
  },
  {
    id: "9",
    name: "プログラミング研究会",
    university: "慶應義塾大学",
    category: "文化学術",
    scale: "100以上",
    memberCount: 110,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHCUuJGUc2VL8KvBp39ZLicl_Yn-pgyGKrQanA6eHFtt9mozjhRQcgcmfzX5rZuNURCQ_7HPPgVFYmIWfZsdULkePeMcnzXGkVnuiWLPFH-kf2_suAyTLpbGuxX_eMtPyy4KMoDoQ-lfgf038wYtNZ55YcRKKrl88nLT7parYiUwYDpQvV7hRVADAYQg1zHapvGrZKVhjkWgxVjkx9e8lV3RENRw_EFoPCzONMAb9h-KBJeFYUc4gaefHpmko04zlKVx10_-9A7LY",
    imageAlt: "Outdoor festival scene on campus",
    tags: ["プログラミング", "ハッカソン", "開発"],
    proofScore: 89,
  },
  {
    id: "10",
    name: "ダンスサークル",
    university: "早稲田大学",
    category: "音楽",
    scale: "50-100",
    memberCount: 75,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDnIgJaq4EHDZdFRqRmWQNdx79uIGdbSbnKfcAT9h5WDQc1g7oI7IfMjlydyHXE9AY4mfvBWu6I2Ne7xvG107IVmzyRczG6YettgS8mFU6kMZ8m7ckccIQ0SAV71JcWOgQAoJNR6_T0UnAk5dZG24Y6_Xacvd_px7lgfd0YK75k73W9f0v4sFvicgwgZVqAtzLZoDOtK80JRQ9ckzsnX01DepT_edkeAlLzKo-lkOnxzfAF_qvruPv5gm7m9cX5D-IrA6mMFeJu9Z8",
    imageAlt: "Students studying in library",
    tags: ["ダンス", "ストリート", "発表会"],
    proofScore: 68,
  },
];
