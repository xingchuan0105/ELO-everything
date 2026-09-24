import type { Metadata } from "next";
import { HelpNav } from "@/components/help/HelpChrome";

export const metadata: Metadata = {
  title: "帮助中心",
  description: "ELO-everything 帮助中心：从零认识 ELO 积分，学会记录线下比赛、登记胜负与更新排名。",
  alternates: { canonical: "/help" },
};

export default function HelpIndexPage() {
  return (
    <div>
      <HelpNav active="/help" />
      <h1>帮助中心</h1>
      <p className="lead">
        从零认识 ELO 积分，并学会用 ELO-everything 记录线下比赛、更新排名。
      </p>

      <div className="help-cards help-cards-4">
        <a href="/help/elo" className="help-card help-card-primary">
          <span className="help-card-kicker">故事 · 三分钟</span>
          <strong>什么是 ELO 积分？</strong>
          <p>用一个会涨会跌的分数，更公平地记录「谁更可能赢谁」。从国际象棋的小故事讲起。</p>
          <span className="help-card-cta">阅读故事 →</span>
        </a>
        <a href="/help/guide" className="help-card">
          <span className="help-card-kicker">操作手册</span>
          <strong>如何使用本应用</strong>
          <p>注册、创建赛事、添加选手、按时间记分、保存草稿与发布排名。</p>
          <span className="help-card-cta">查看步骤 →</span>
        </a>
        <a href="/help/params" className="help-card">
          <span className="help-card-kicker">参数百科</span>
          <strong>参数与概念说明</strong>
          <p>积分步长 K、起始分、新手设置……每一项怎么填、填大填小有什么影响。</p>
          <span className="help-card-cta">查参数 →</span>
        </a>
        <a href="/help/faq" className="help-card">
          <span className="help-card-kicker">快速答疑</span>
          <strong>常见问题</strong>
          <p>草稿和发布差在哪？为什么要填时间？录错了怎么办？选手要注册吗？</p>
          <span className="help-card-cta">看 FAQ →</span>
        </a>
      </div>

      <section className="card" style={{ marginTop: "1.25rem" }}>
        <h2>参数速查</h2>
        <div className="help-quick-links">
          <a href="/help/params#k-factor">积分步长 K</a>
          <a href="/help/params#start-rating">起始分</a>
          <a href="/help/params#k-provisional">新手步长</a>
          <a href="/help/params#provisional-games">新手保护场次</a>
          <a href="/help/params#played-at">对局时间</a>
          <a href="/help/params#draft">草稿</a>
          <a href="/help/params#publish">发布</a>
          <a href="/help/guide#timing">时序规则</a>
          <a href="/help/faq#draft-vs-publish">草稿 vs 发布</a>
          <a href="/help/faq#wrong-entry">录错了</a>
        </div>
      </section>
    </div>
  );
}
