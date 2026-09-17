import { HashHighlight, HelpFooterNav, HelpNav } from "@/components/help/HelpChrome";

export default function HelpGuidePage() {
  return (
    <div>
      <HelpNav active="/help/guide" />
      <HashHighlight />

      <article className="help-article">
        <h1>如何使用 ELO-everything</h1>
        <p className="lead">
          按真实流程走一遍：从注册到发布排名。你是<strong>记录员</strong>；选手只需被你写上名字。
        </p>

        <div className="help-article-layout">
        <nav className="help-toc" aria-label="本页目录">
          <a href="#roles">角色</a>
          <a href="#login">注册与登录</a>
          <a href="#create-event">创建赛事</a>
          <a href="#add-players">添加选手</a>
          <a href="#score">登记对局</a>
          <a href="#timing">按时间顺序录入</a>
          <a href="#draft-publish">草稿与发布</a>
          <a href="#rank">查看排名</a>
          <a href="#pair">辅助配对</a>
          <a href="#void">录错了</a>
          <a href="#checklist">检查清单</a>
        </nav>

        <div className="help-article-main">
        <section id="roles" className="help-section">
          <h2>你是记录员，不是选手</h2>
          <p>
            登录账号给<strong>记分、管赛事的人</strong>用。选手（张三、李四）不用注册，只要在赛事里被添加姓名即可。
          </p>
        </section>

        <section id="login" className="help-section">
          <h2>注册与登录</h2>
          <ol>
            <li>打开「注册」，填写<strong>邮箱</strong>和<strong>密码</strong>（至少 8 位）。</li>
            <li>登录后顶栏显示「已登录」与你的名字，可进入<strong>工作台</strong>。</li>
            <li>已登录时不会再显示注册入口；可随时「退出」。</li>
          </ol>
        </section>

        <section id="create-event" className="help-section">
          <h2>创建一场赛事</h2>
          <p>
            在 <a href="/app">工作台</a> 创建赛事。一场赛事 = 一组选手共用一套排名（例如「周五桌球局」）。
          </p>
          <ul>
            <li>
              <strong>赛事名称</strong>：好认即可。
            </li>
            <li>
              <strong>积分步长 K</strong>、<strong>起始分</strong>、是否<strong>允许平局</strong>：创建时可设。详见{" "}
              <a href="/help/params">参数说明</a>。
            </li>
          </ul>
          <p>创建后点进该赛事，进入记分页面。</p>
        </section>

        <section id="add-players" className="help-section">
          <h2>添加选手</h2>
          <ol>
            <li>打开赛事 →「选手」页签。</li>
            <li>
              每行一个名字，或用逗号分隔。需要标注队伍时写{" "}
              <code>张三@火箭队</code> 或 <code>张三|火箭队</code>（队伍名可选，仅展示）。
            </li>
            <li>选手初始积分为赛事的起始分；打完并发布后才会变化。</li>
          </ol>
          <p>
            <strong>队伍名不是计分实体</strong>
            ：积分账本仍在「选手」上。固定战队场景可给多人填同一队名，方便辨认；组队对局仍是选人进主/客边，用成员均分算边分。
          </p>
        </section>

        <section id="score" className="help-section">
          <h2>登记对局</h2>
          <p>在「记分」页签使用表格（默认多行，便于批量）：</p>
          <ol>
            <li>填写<strong>对局时间</strong>（尽量贴近真实先后）。</li>
            <li>
              选择本行<strong>人数</strong>（1v1～5v5）。创建赛事时有默认赛制，每一行可单独改。
            </li>
            <li>
              选择<strong>主</strong>、<strong>客</strong>两侧选手（中性称呼）。两侧人数须相等；同一人不能两边都上。
            </li>
            <li>
              选择结果：<strong>主胜 / 客胜 / 平局</strong>（若赛事允许平局）。
            </li>
            <li>可选填比分；右侧会显示<strong>预计积分变化</strong>（已按时间链模拟）。</li>
          </ol>
          <p>
            <strong>组队怎么算分？</strong>
            本产品采用<strong>个体本位</strong>：先对一侧成员积分取平均得到「边分」，再按与 1v1
            相同的规则算期望与变动；同侧每位选手获得<strong>相同的完整 Δ</strong>
            （equal full-Δ，不是把 Δ 除以人数）。可选队伍名不影响算分，只方便显示。
          </p>
        </section>

        <section id="timing" className="help-section">
          <h2>按真实时间顺序录入（重要）</h2>
          <p>若同一个人打了多场，系统会按<strong>对局时间从早到晚</strong>一场一场算分：</p>
          <ul>
            <li>先算早的一场 → 更新双方积分；</li>
            <li>再算晚的一场 → 用的是<strong>已经更新后</strong>的积分。</li>
          </ul>
          <p>
            因此：请把「对局时间」填成现场真实顺序。若把后打的那场时间填得更早，排名可能和现场印象不一致。
          </p>
          <p>
            批量多行时，默认时间会略错开，仍请改成真实时间。详见{" "}
            <a href="/help/params#played-at">对局时间</a>。
          </p>
        </section>

        <section id="draft-publish" className="help-section">
          <h2>保存草稿 vs 发布更新排名</h2>
          <table className="table">
            <thead>
              <tr>
                <th>操作</th>
                <th>含义</th>
                <th>积分 / 排名</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>保存草稿</td>
                <td>先记下来，确认无误再算</td>
                <td>不变</td>
              </tr>
              <tr>
                <td>发布更新排名</td>
                <td>正式按时间顺序计分</td>
                <td>更新</td>
              </tr>
            </tbody>
          </table>
          <p>
            发布失败时，本批不会「只成功一半」（整批回滚）。发布成功后会进入「排名」页。
          </p>
        </section>

        <section id="rank" className="help-section">
          <h2>查看排名</h2>
          <p>「排名」页签按当前积分从高到低排列。只有<strong>已发布</strong>的对局会影响这里。</p>
        </section>

        <section id="pair" className="help-section">
          <h2>（可选）辅助配对</h2>
          <p>
            不想自己排谁打谁时，可用「辅助配对」生成主客对阵并填入记分表，再按真实时间改时间、选结果，最后保存/发布。
          </p>
        </section>

        <section id="void" className="help-section">
          <h2>录错了怎么办</h2>
          <ul>
            <li>
              <strong>草稿</strong>：直接删除即可。
            </li>
            <li>
              <strong>已发布</strong>：在「历史 / 撤销」中撤销该场，系统会按剩余场次重算排名。
            </li>
          </ul>
        </section>

        <section id="checklist" className="help-section">
          <h2>一场完整比赛检查清单</h2>
          <ol>
            <li>□ 已创建赛事并设好 K / 起始分</li>
            <li>□ 选手名单齐全</li>
            <li>□ 对局时间与现场顺序一致</li>
            <li>□ 主客与胜负正确；需要时有平局</li>
            <li>□ 先保存草稿核对，再发布更新排名</li>
            <li>□ 打开排名确认分数有变化</li>
          </ol>
        </section>

        <HelpFooterNav
          prev={{ href: "/help/elo", label: "什么是 ELO" }}
          next={{ href: "/help/params", label: "参数说明" }}
        />
        <p className="subtle" style={{ marginTop: "1rem", textAlign: "center" }}>
          卡住了？看看 <a href="/help/faq">常见问题</a>
        </p>
        </div>
        </div>
      </article>
    </div>
  );
}
