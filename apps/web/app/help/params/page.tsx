import type { ReactNode } from "react";
import { HashHighlight, HelpFooterNav, HelpNav } from "@/components/help/HelpChrome";

export default function HelpParamsPage() {
  return (
    <div>
      <HelpNav active="/help/params" />
      <HashHighlight />

      <article className="help-article">
        <h1>参数与概念说明</h1>
        <p className="lead">
          创建赛事、记分时看到的每一个词，这里都有「是什么、怎么填、建议多少、填大填小会怎样」。
          界面上的 <span className="help-tip-btn help-tip-btn-demo">?</span>{" "}
          点进去也会跳到本节对应条目。
        </p>

        <div className="help-article-layout">
        <nav className="help-toc" aria-label="本页目录">
          <a href="#k-factor">积分步长 K</a>
          <a href="#start-rating">起始分</a>
          <a href="#k-provisional">新手步长</a>
          <a href="#provisional-games">新手保护场次</a>
          <a href="#allow-draw">允许平局</a>
          <a href="#played-at">对局时间</a>
          <a href="#home-away">主 / 客</a>
          <a href="#draft">草稿</a>
          <a href="#publish">发布</a>
          <a href="#rating">积分</a>
          <a href="#ranking">排名</a>
          <a href="#void">撤销</a>
        </nav>

        <div className="help-article-main">
        <ParamBlock
          id="k-factor"
          title="积分步长 K"
          oneLiner="控制「一场比赛，分数大概能跳多高」。"
          what="K 像音量旋钮：同样一场胜负，K 越大，双方分数变动越大。"
          how="在「创建赛事」时填写。一般用默认即可，也可按社群习惯调整。"
          suggest="业余朋友局常用 24–32；希望别大起大落可用 16；娱乐向想刺激一点可用 40。系统上限 64。"
          high="一场爆冷分差巨大，榜单像过山车，短期发挥盖过长期稳定。"
          low="打很多场分还差不多，难以及时反映状态变化。"
          related={
            <>
              <a href="#k-provisional">新手步长</a> · <a href="#provisional-games">新手保护场次</a>
            </>
          }
          where="工作台 → 创建赛事 →「积分步长 K」"
        />

        <ParamBlock
          id="start-rating"
          title="起始分"
          oneLiner="新人（或新赛事）第一次出现的分数。"
          what="只是尺子的起点附近。重要的是之后相对别人怎么涨跌，而不是绝对数字本身。"
          how="创建赛事时设定。本产品里各赛事独立，起始分不必和别的赛事强行统一。"
          suggest="最常见 1500；想分数看起来「小一点」可用 1000 或 1200。"
          high="观感上人人分都高，不影响相对比较。"
          low="观感上分数偏低，同样不影响相对比较。"
          related={
            <>
              <a href="#rating">积分</a>
            </>
          }
          where="工作台 → 创建赛事 →「起始分」"
        />

        <ParamBlock
          id="k-provisional"
          title="新手步长"
          oneLiner="刚打前几场时用的更大步长，让分数快点「找到位置」。"
          what="新手真实水平不确定，用稍大的步长可以更快把分调到合适区间。"
          how="创建赛事 → 高级设置。必须不小于普通 K；若填小了，系统会自动抬到至少等于 K。"
          suggest="K=32 时常用 40；K=24 时可用 32–36。"
          high="定级快，但前几场波动很猛，榜单短期乱跳。"
          low="和普通 K 差不多，新手期意义不大。"
          related={
            <>
              <a href="#k-factor">积分步长 K</a> · <a href="#provisional-games">新手保护场次</a>
            </>
          }
          where="创建赛事 → 高级设置 →「新手步长」"
        />

        <ParamBlock
          id="provisional-games"
          title="新手保护场次"
          oneLiner="使用「新手步长」的场数；超过后改用普通 K。"
          what="前 N 场用新手步长，之后视为「已定级」，改用更稳的 K。"
          how="创建赛事 → 高级设置。填 0 表示从第一场就用普通 K。"
          suggest="10–30 较常见；人少、想快点稳可用 10–15；希望多观察用 20–30。"
          high="长时间分差剧烈，榜单长时间像新号专场。"
          low="几乎没有新手加速期。"
          related={
            <>
              <a href="#k-provisional">新手步长</a>
            </>
          }
          where="创建赛事 → 高级设置 →「新手保护场次」；排名里可能显示「新面孔」"
        />

        <ParamBlock
          id="allow-draw"
          title="允许平局"
          oneLiner="记分时是否可以选择「平局」。"
          what="有的项目没有平局（必须分出胜负），有的可以和棋、平局。"
          how="创建赛事时勾选。关闭后，记分界面不出现平局按钮。"
          suggest="棋类、部分桌游可开；必须分胜负的项目可关。"
          high="—"
          low="—"
          related={
            <>
              <a href="/help/guide#score">使用说明 · 登记对局</a>
            </>
          }
          where="创建赛事 →「允许平局」"
        />

        <ParamBlock
          id="played-at"
          title="对局时间"
          oneLiner="这场球实际发生的时间，用来决定算分顺序。"
          what="发布时按时间从早到晚链式计分。同一人多场时，后一场基于前一场更新后的积分。"
          how="记分表每一行填写。尽量贴近真实开打/结束时间；批量录入时务必检查先后。"
          suggest="现场用手机备忘或纸笔记时间，录入时对齐。默认时间会略错开，仍请改成真实值。"
          high="把晚打的那场填得更早 → 用错「当时积分」，排名偏离现场。"
          low="时间乱序或全填一样又不调行序 → 链式结果可能不符合直觉。"
          related={
            <>
              <a href="/help/guide#timing">使用说明 · 时序规则</a> · <a href="#publish">发布</a>
            </>
          }
          where="记分页表格列「对局时间」"
        />

        <ParamBlock
          id="home-away"
          title="主 / 客"
          oneLiner="对阵双方的中性称呼，方便区分两边。"
          what="只是标签，不表示主场优势（当前版本不算主客让分）。1～5 人组队时，主/客各选同等人数的选手。"
          how="记分时分别选择「主」「客」一侧的选手（人数 1–5 可改），再选主胜 / 客胜 / 平局。"
          suggest="可按场地习惯固定某人在主，或随机；前后一致即可。固定战队可给选手填同一「队伍名」便于辨认。"
          high="—"
          low="—"
          related={
            <>
              <a href="/help/guide#score">登记对局</a> · <a href="/help/guide#add-players">添加选手</a>
            </>
          }
          where="记分表「主」「客」列；人数列 1v1～5v5"
        />

        <ParamBlock
          id="draft"
          title="草稿"
          oneLiner="已保存、还没算进排名的对局记录。"
          what="方便你先批量录完、检查一遍，再正式计分。"
          how="点「保存草稿」。可在「待发布草稿」列表删除。"
          suggest="多人录入或怕点错时，先草稿再发布。"
          high="—"
          low="—"
          related={
            <>
              <a href="#publish">发布</a>
            </>
          }
          where="记分页 →「保存草稿」"
        />

        <ParamBlock
          id="publish"
          title="发布"
          oneLiner="把草稿（及表格中完整行）按对局时间正式计分，并更新排名。"
          what="这是积分真正变化的一步。按时间顺序一场一场算；失败则整批回滚。"
          how="点「发布更新排名」。也可只发布已有草稿。"
          suggest="核对时间与胜负后再点；发布后看排名页是否变化。"
          high="—"
          low="—"
          related={
            <>
              <a href="#draft">草稿</a> · <a href="#played-at">对局时间</a>
            </>
          }
          where="记分页 →「发布更新排名」"
        />

        <ParamBlock
          id="rating"
          title="积分（ELO 积分）"
          oneLiner="表示相对强弱的一个分数。"
          what="赢强的多涨、赢弱的少涨。各赛事独立计算。"
          how="无需手填；由系统在「发布」后自动更新。"
          suggest="结合故事篇理解更佳。"
          high="—"
          low="—"
          related={
            <>
              <a href="/help/elo">什么是 ELO 积分</a>
            </>
          }
          where="选手列表、排名表中的分数"
        />

        <ParamBlock
          id="ranking"
          title="排名"
          oneLiner="按当前积分从高到低排列选手。"
          what="只反映已发布对局；草稿不影响排名。"
          how="打开赛事 →「排名」页签；发布后会自动跳转。"
          suggest="—"
          high="—"
          low="—"
          related={
            <>
              <a href="#publish">发布</a>
            </>
          }
          where="赛事记分页 → 排名"
        />

        <ParamBlock
          id="void"
          title="撤销"
          oneLiner="作废一场已发布对局，并按剩余场次重新计算排名。"
          what="录错胜负或录重了可以用。草稿则直接删除即可。"
          how="「历史 / 撤销」→ 选择该场 → 撤销。"
          suggest="撤销后检查排名是否符合预期。"
          high="—"
          low="—"
          related={
            <>
              <a href="/help/guide#void">使用说明 · 录错了</a>
            </>
          }
          where="历史 / 撤销"
        />

        <HelpFooterNav
          prev={{ href: "/help/guide", label: "如何使用" }}
          next={{ href: "/help/faq", label: "常见问题" }}
        />
        </div>
        </div>
      </article>
    </div>
  );
}

function ParamBlock(props: {
  id: string;
  title: string;
  oneLiner: string;
  what: string;
  how: string;
  suggest: string;
  high: string;
  low: string;
  related: ReactNode;
  where: string;
}) {
  return (
    <section id={props.id} className="help-section help-param">
      <h2>{props.title}</h2>
      <p className="help-one-liner">{props.oneLiner}</p>
      <dl className="help-dl">
        <dt>是什么 / 有什么用</dt>
        <dd>{props.what}</dd>
        <dt>怎么填</dt>
        <dd>{props.how}</dd>
        <dt>建议填多少</dt>
        <dd>{props.suggest}</dd>
        {props.high !== "—" && (
          <>
            <dt>填大了会怎样</dt>
            <dd>{props.high}</dd>
          </>
        )}
        {props.low !== "—" && (
          <>
            <dt>填小了会怎样</dt>
            <dd>{props.low}</dd>
          </>
        )}
        <dt>相关</dt>
        <dd>{props.related}</dd>
        <dt>在界面哪里</dt>
        <dd>{props.where}</dd>
      </dl>
    </section>
  );
}
