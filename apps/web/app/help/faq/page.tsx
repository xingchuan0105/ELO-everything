import type { ReactNode } from "react";
import { HashHighlight, HelpFooterNav, HelpNav } from "@/components/help/HelpChrome";

export default function HelpFaqPage() {
  return (
    <div>
      <HelpNav active="/help/faq" />
      <HashHighlight />

      <article className="help-article">
        <h1>常见问题</h1>
        <p className="lead">
          记分时最常碰到的问题。更细的步骤见{" "}
          <a href="/help/guide">如何使用</a>；参数含义见{" "}
          <a href="/help/params">参数说明</a>。
        </p>

        <div className="help-article-layout">
        <nav className="help-toc" aria-label="本页目录">
          <a href="#who-registers">谁要注册</a>
          <a href="#what-is-elo">ELO 是什么</a>
          <a href="#draft-vs-publish">草稿 vs 发布</a>
          <a href="#why-time">为什么填时间</a>
          <a href="#wrong-entry">录错了</a>
          <a href="#k-meaning">K 是什么</a>
          <a href="#draw">平局</a>
          <a href="#cross-event">赛事互通吗</a>
          <a href="#team-scoring">组队怎么算</a>
          <a href="#pairing">辅助配对</a>
          <a href="#no-account-player">选手要账号吗</a>
        </nav>

        <div className="help-article-main">
        <Faq
          id="who-registers"
          q="谁需要注册账号？"
          a={
            <>
              只有<strong>记录员</strong>（记分、管赛事的人）需要邮箱注册。选手只需被你写上姓名，不用登录。详见{" "}
              <a href="/help/guide#roles">使用说明 · 角色</a>。
            </>
          }
        />

        <Faq
          id="what-is-elo"
          q="ELO 积分到底是什么？"
          a={
            <>
              用一个会涨会跌的分数，表示选手之间的<strong>相对强弱</strong>：赢强的多涨，赢弱的少涨。不是只数胜场。{" "}
              <a href="/help/elo">三分钟故事 →</a>
              {" · "}
              <a href="/help/elo#formula">核心公式（折叠）</a>
            </>
          }
        />

        <Faq
          id="draft-vs-publish"
          q="「保存草稿」和「发布更新排名」有什么区别？"
          a={
            <>
              <strong>草稿</strong>只保存记录，选手积分与排名不变；可改可删。
              <strong>发布</strong>才会按对局时间正式计分并更新排名；失败则整批不入账。{" "}
              <a href="/help/guide#draft-publish">详细说明</a>
            </>
          }
        />

        <Faq
          id="why-time"
          q="为什么一定要认真填「对局时间」？"
          a={
            <>
              同一人若打了多场，系统按时间从早到晚一场一场算：后一场用的是前一场更新后的积分。时间填反了，排名可能和现场印象不一致。{" "}
              <a href="/help/guide#timing">时序规则</a>
            </>
          }
        />

        <Faq
          id="wrong-entry"
          q="录错了怎么办？"
          a={
            <>
              还是草稿：直接删除。已经发布：到「历史 / 撤销」作废该场，系统会按剩余场次重算。{" "}
              <a href="/help/guide#void">录错了怎么办</a>
            </>
          }
        />

        <Faq
          id="k-meaning"
          q="积分步长 K 该填多少？"
          a={
            <>
              K 控制一场比赛分数大概能跳多大。业余朋友局常用 <strong>24–32</strong>；想稳一点用 16；想刺激可用 40（勿超过 64）。{" "}
              <a href="/help/params#k-factor">参数 · K</a>
            </>
          }
        />

        <Faq
          id="draw"
          q="可以记平局吗？"
          a={
            <>
              创建赛事时勾选「允许平局」后，记分可选平局；双方分数变动通常较小。关闭后界面不出现平局按钮。{" "}
              <a href="/help/params#allow-draw">参数 · 允许平局</a>
            </>
          }
        />

        <Faq
          id="cross-event"
          q="不同赛事的积分会混在一起吗？"
          a={
            <>
              不会。每一场<strong>赛事</strong>有自己的一套积分与排名，互不影响。新人在该赛事的起始分由创建时设定。
            </>
          }
        />

        <Faq
          id="team-scoring"
          q="2v2 / 5v5 怎么算分？队伍名有用吗？"
          a={
            <>
              主客两侧人数须相等（最多每队 5 人）。系统用两侧成员积分的<strong>平均</strong>
              当边分，算出 Δ 后同侧每人加/减<strong>相同的完整 Δ</strong>
              。选手可填可选队伍名（如 <code>张三@火箭</code>
              ）方便显示，但<strong>积分账本在个人</strong>，没有单独的「队积分」。详见{" "}
              <a href="/help/guide#score">组队记分</a>。
            </>
          }
        />

        <Faq
          id="pairing"
          q="辅助配对是必须的吗？"
          a={
            <>
              不是。你可以自己在记分表选主客；辅助配对只是帮你生成对阵并填入表格，之后仍要改真实时间、选结果，再草稿/发布。{" "}
              <a href="/help/guide#pair">使用说明 · 配对</a>
            </>
          }
        />

        <Faq
          id="no-account-player"
          q="选手能自己看排名吗？"
          a={
            <>
              v1 以记录员操作为主：你登录后打开赛事的「排名」页签即可展示给大家看。选手无需单独账号。
            </>
          }
        />

        <HelpFooterNav
          prev={{ href: "/help/params", label: "参数说明" }}
          next={{ href: "/app", label: "进入工作台" }}
        />
        </div>
        </div>
      </article>
    </div>
  );
}

function Faq({
  id,
  q,
  a,
}: {
  id: string;
  q: string;
  a: ReactNode;
}) {
  return (
    <section id={id} className="help-section help-faq">
      <h2>{q}</h2>
      <p>{a}</p>
    </section>
  );
}
