import { BRAND_HOME, BRAND_NAME } from "@/lib/brand";

export default function HomePage() {
  return (
    <div>
      <div className="hero-logo" aria-hidden>
        <img src="/brand/logo-full.svg" alt="" width={280} height={64} />
      </div>
      <h1>ELO-everything</h1>
      <p className="lead">
        线下球局、桌游、办公室比赛的记分工具。你是<strong>记录员</strong>：建一场赛事、把选手加进去、登记胜负，排名自动更新。
        属于{" "}
        <a href={BRAND_HOME} className="brand-inline-link">
          {BRAND_NAME}
        </a>{" "}
        工具家族。
      </p>

      {/* H1 主入口：什么是 ELO */}
      <a href="/help/elo" className="help-hero-card">
        <span className="help-card-kicker">从零开始 · 三分钟</span>
        <strong className="help-hero-title">什么是 ELO 积分？</strong>
        <p>
          用一个会涨会跌的分数，更公平地记录「谁更可能赢谁」。来自国际象棋的小故事，不懂棋也能看懂。
        </p>
        <span className="help-card-cta">阅读故事 →</span>
      </a>

      <div className="toolbar" style={{ marginTop: "1rem" }}>
        <a className="btn btn-primary" href="/app">
          进入工作台
        </a>
        <a className="btn btn-secondary" href="/help/guide">
          如何使用本应用
        </a>
        <a className="btn btn-ghost" href="/help">
          帮助中心
        </a>
        <a className="btn btn-ghost" href={BRAND_HOME}>
          ← 返回 {BRAND_NAME} 官网
        </a>
      </div>

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.75rem" }}>三步上手记分流程</h2>
        <ol className="steps">
          <li>
            <span className="n">1</span>
            <span>创建一场赛事（例如：周五桌球局）</span>
          </li>
          <li>
            <span className="n">2</span>
            <span>添加选手姓名（选手不用注册账号）</span>
          </li>
          <li>
            <span className="n">3</span>
            <span>按真实时间登记对局 → 保存草稿 → 发布更新排名</span>
          </li>
        </ol>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>记分机制与等级分计算方法</h2>
        <p style={{ color: "hsl(var(--muted-foreground))", margin: "0 0 0.5rem", fontSize: "14px", lineHeight: "1.6" }}>
          本工具计算规则严格遵循 Elo 等级分算法：根据双方赛前积分差距计算期望胜率，胜负结算后动态调整分数（赢强敌多得分，战胜弱手少得分）。算法实现透明，支持自定义 K 值与初始分。
        </p>
        <p style={{ color: "hsl(var(--muted-foreground))", margin: 0, fontSize: "13px" }}>
          来源依据：标准国际象棋等级分模型（详见 <a href="/help/elo" style={{ textDecoration: "underline" }}>ELO 原理与公式文档</a>）。
        </p>
      </section>

      <p className="subtle" style={{ marginTop: "1.75rem" }}>
        记录员账号登录后可创建赛事 ·{" "}
        <a href="/help/elo">还不懂 ELO？先看故事</a>
        {" · "}
        <a href={BRAND_HOME}>Context-OS 官网</a>
        {" · "}
        作者：邢川 · ContextLM 出品 · 页面更新日期：2026-08-18
      </p>
    </div>
  );
}
