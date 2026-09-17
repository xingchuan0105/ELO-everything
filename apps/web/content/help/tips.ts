export type HelpTipId =
  | "k-factor"
  | "start-rating"
  | "k-provisional"
  | "provisional-games"
  | "allow-draw"
  | "played-at"
  | "draft"
  | "publish"
  | "home-away"
  | "rating"
  | "ranking"
  | "void";

export type HelpTipDef = {
  label: string;
  summary: string;
  href: string;
};

/** 悬停摘要 + 点击跳转目标（与 /help/params 锚点一致） */
export const HELP_TIPS: Record<HelpTipId, HelpTipDef> = {
  "k-factor": {
    label: "积分步长 K",
    summary:
      "控制一场比赛分数大概能跳多大。越大反应越快，越小越稳。朋友局常用 24–32。",
    href: "/help/params#k-factor",
  },
  "start-rating": {
    label: "起始分",
    summary:
      "新人第一次上场的分数，只是尺子的起点。常用 1500；重要的是之后相对别人怎么变。",
    href: "/help/params#start-rating",
  },
  "k-provisional": {
    label: "新手步长",
    summary:
      "刚打前几场时用的更大步长，让分数快点「找到位置」。应不小于普通 K。",
    href: "/help/params#k-provisional",
  },
  "provisional-games": {
    label: "新手保护场次",
    summary:
      "用新手步长的场数；超过后改用普通 K。常用 10–30 场。",
    href: "/help/params#provisional-games",
  },
  "allow-draw": {
    label: "允许平局",
    summary: "开启后记分可选「平局」，双方分数变动通常较小。",
    href: "/help/params#allow-draw",
  },
  "played-at": {
    label: "对局时间",
    summary:
      "实际比赛先后顺序。同一人多场时，后一场按前一场更新后的积分计算。请按真实时序填写。",
    href: "/help/params#played-at",
  },
  draft: {
    label: "草稿",
    summary: "已保存但还没算进排名。可以改、可以删，选手积分不变。",
    href: "/help/params#draft",
  },
  publish: {
    label: "发布",
    summary: "把草稿按对局时间正式计分并更新排名。失败则整批不入账。",
    href: "/help/params#publish",
  },
  "home-away": {
    label: "主 / 客",
    summary: "对阵双方的中性称呼，方便区分两边；v1 不额外加主场优势。",
    href: "/help/params#home-away",
  },
  rating: {
    label: "积分",
    summary: "表示相对强弱的分数。赢强的多涨，赢弱的少涨。",
    href: "/help/params#rating",
  },
  ranking: {
    label: "排名",
    summary: "按当前积分从高到低排列。发布对局后才会变化。",
    href: "/help/params#ranking",
  },
  void: {
    label: "撤销",
    summary: "作废一场已发布对局，并按剩余场次重新计算排名。",
    href: "/help/params#void",
  },
};
