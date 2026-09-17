import { HashHighlight, HelpFooterNav, HelpNav } from "@/components/help/HelpChrome";

export default function HelpEloPage() {
  return (
    <div>
      <HelpNav active="/help/elo" />
      <HashHighlight />

      <article className="help-article">
        <h1>什么是 ELO 积分？</h1>
        <p className="lead">
          不用会下棋，也能听懂。下面用讲故事的方式，说明这个「会涨会跌的分数」从哪来、怎么用，以及在
          ELO-everything 里它为你做什么。若想从「正态表现假设」一路推到期望得分与更新式，请展开「核心公式」折叠区。
        </p>

        <div className="help-article-layout">
          <nav className="help-toc" aria-label="本页目录">
            <a href="#origin">故事从哪来</a>
            <a href="#why">为什么不只数胜场</a>
            <a href="#number">一个数字代表什么</a>
            <a href="#how">一场比赛后分数怎么变</a>
            <a href="#formula">核心公式（可选）</a>
            <a href="#example">小例子</a>
            <a href="#where">还用在哪里</a>
            <a href="#in-app">在本产品里</a>
            <a href="#limits">它不保证什么</a>
          </nav>

          <div className="help-article-main">
            <section id="origin" className="help-section">
              <h2>故事从国际象棋说起</h2>
              <p>
                很久以前，人们就想给棋手排个名：谁更强？只数「赢了多少盘」并不公平——有人总找新手打，有人专挑高手。
              </p>
              <p>
                匈牙利裔物理学家兼棋手 <strong>阿帕德·埃洛（Arpad Elo）</strong>{" "}
                设计了一套用<strong>一个分数</strong>描述相对强弱的办法。后来人们就叫它{" "}
                <strong>ELO 积分</strong>（也常写作 Elo）。
              </p>
              <p>
                这套思路简单、好解释，慢慢从棋类传到电竞、桌游、球类业余联赛，以及——你正在用的这类记分工具。
              </p>
            </section>

            <section id="why" className="help-section">
              <h2>为什么需要「积分」，而不是只数胜场？</h2>
              <p>假设两种人：</p>
              <ul>
                <li>甲：专打新手，胜率很高，但对手都偏弱；</li>
                <li>乙：专打高手，胜率一般，但对手很强。</li>
              </ul>
              <p>
                如果只比「赢了几场」，甲可能看起来更猛，可大家心里都觉得乙更强。积分系统要解决的，就是这件事：
              </p>
              <p>
                <strong>
                  赢强的，应该多涨一点；赢弱的，应该少涨一点。输给强的，少扣一点；输给弱的，多扣一点。
                </strong>
              </p>
            </section>

            <section id="number" className="help-section">
              <h2>一个数字，代表什么？</h2>
              <p>
                积分是<strong>相对</strong>的：重要的不是「1500 等于几段」，而是<strong>你和对手差多少</strong>。
              </p>
              <p>
                分差大时，系统会认为高分一方更可能赢；若结果和预期一致，分数变动较小；若爆冷，分数变动较大。
              </p>
              <p>在 ELO-everything 里，每一场<strong>赛事</strong>有自己的一套积分，互不混用。</p>
            </section>

            <section id="how" className="help-section">
              <h2>一场比赛后，分数怎么变？</h2>
              <p>可以想成三步（不必记公式）：</p>
              <ol>
                <li>
                  <strong>估一估</strong>
                  ：把「临场发挥」想成围绕积分的随机波动（经典 Elo 用<strong>正态分布</strong>描述这种波动），由此倒推出谁更可能赢——即期望得分
                  E。
                </li>
                <li>
                  <strong>看结果</strong>：实际谁赢了（或平局）。若结果「很意外」（偏离 E），分数要动得更多。
                </li>
                <li>
                  <strong>步长 K</strong>：像音量旋钮，控制「一场最多能抖多狠」。K 大，榜单反应快；K 小，更稳。
                </li>
              </ol>
              <p>
                在常见设置下，你加的分和对方扣的分大致对称——有人涨就有人跌，榜不会无缘无故整体飞升。
              </p>
              <p>
                为什么是正态、方程怎么从假设推出来？见下方{" "}
                <a href="#formula">核心公式</a>。调 K / 起始分见{" "}
                <a href="/help/params#k-factor">参数说明 · 积分步长 K</a>。
              </p>
            </section>

            <section id="formula" className="help-section">
              <h2>核心公式（可选阅读）</h2>
              <p className="muted">
                日常记分<strong>不用手算</strong>。真正要讲透的一点是：Elo
                <strong>先假设「临场表现」服从正态分布</strong>，再倒推出双方胜负期望；下面折叠区从「为什么是正态」讲到更新式与本产品实现。默认收起。
              </p>

              <details className="help-details" id="formula-core">
                <summary>想多了解一点：正态假设 → 胜负期望 → 更新式（含推导）</summary>
                <div className="help-details-body">
                  <h3>0. 一句话地图</h3>
                  <ol>
                    <li>
                      给每人一个潜在实力标尺 R（积分）
                    </li>
                    <li>
                      假设每场比赛的「临场发挥」= 实力 + 随机扰动，且扰动大致<strong>正态</strong>
                    </li>
                    <li>
                      由「谁发挥更好谁赢」倒推出胜负概率 E（期望得分）
                    </li>
                    <li>
                      用实际结果与 E 的差，乘以步长 K，修正双方积分
                    </li>
                  </ol>
                  <p>
                    网上常直接甩出逻辑斯蒂公式；那是<strong>便于计算的近似/变体</strong>。概念源头是 Elo
                    的<strong>正态表现模型</strong>。
                  </p>

                  <h3>1. 为什么先谈正态分布？</h3>
                  <p>
                    <strong>正态分布（高斯分布）</strong>在自然界与复杂系统里极其常见：身高、测量误差、许多宏观观测量的涨落……常常呈现「中间多、两头少、大致对称」的钟形。
                  </p>
                  <p>背后常有两条互补的直觉（不必当数学定理背，但有助于理解「凭什么用正态」）：</p>
                  <ul>
                    <li>
                      <strong>中心极限定理（CLT）方向</strong>
                      ：若一个结果是<strong>许多彼此差不多、相对独立的小影响加总</strong>而成（睡眠、手感、开局运气、细小判断误差……），总和在温和条件下会逼近正态——哪怕每个小因素本身不是正态。
                    </li>
                    <li>
                      <strong>物理 / 复杂系统里的「典型涨落」</strong>
                      ：大量微观自由度、弱相关噪声叠加时，宏观量的涨落往往可用高斯近似（统计物理、测量学里随处可见）。比赛里的「状态波动」很像这种：实力是中心，临场是围绕中心的随机扰动。
                    </li>
                  </ul>
                  <p>
                    因此：当我们<strong>不知道</strong>临场扰动的精确分布，只知道「有一个典型水平 + 可加的随机噪声、极端偏差较少」时，
                    <strong>正态是最省事、也最常见的默认假设</strong>。Elo 正是建立在这一类假设上，而不是拍脑袋画一条任意曲线。
                  </p>
                  <p className="help-formula-note">
                    当然，真实对局还有开局库、克星关系、疲劳等结构化因素；正态模型是可计算的一阶近似，不是「绝对真理」。人少场次少时，分数抖得厉害，也正说明噪声主导。
                  </p>

                  <h3>2. Elo 的核心假设：表现 = 实力 + 正态噪声</h3>
                  <p>
                    记双方积分为 R<sub>A</sub>、R<sub>B</sub>。Elo 把<strong>这一场</strong>的「临场表现」想成随机变量：
                  </p>
                  <code className="help-formula" aria-label="正态表现模型">
                    {`X_A  ~  Normal( μ = R_A ,  σ )
X_B  ~  Normal( μ = R_B ,  σ )
（两边方差相同；彼此独立——经典简化）`}
                  </code>
                  <p>
                    含义：长期看，A 的发挥围绕 R<sub>A</sub> 波动；σ 描述「状态起伏有多大」。实力高的人，钟形曲线的中心更靠右，但仍可能某一场状态崩盘。
                  </p>
                  <p>
                    <strong>胜负规则（简化）</strong>：若 X<sub>A</sub> &gt; X<sub>B</sub> 则 A 胜（可再引入平局带，v1 记分用 1 / 0 / 0.5 离散结果即可）。
                  </p>

                  <h3>3. 从正态倒推：胜负期望怎么来？</h3>
                  <p>
                    因为两个独立正态相减仍是正态：
                  </p>
                  <code className="help-formula" aria-label="表现差的分布">
                    {`D = X_A − X_B  ~  Normal( R_A − R_B ,  σ√2 )
（均值 = 分差，方差 = σ² + σ² = 2σ²）`}
                  </code>
                  <p>
                    A 获胜概率 = P(D &gt; 0)。把 D 标准化后，得到用<strong>标准正态累积分布函数 Φ</strong>表示的期望：
                  </p>
                  <code className="help-formula" aria-label="正态模型下的胜率">
                    {`E_A  =  P(X_A > X_B)
     =  Φ( (R_A − R_B) / (σ√2) )

E_B  =  1 − E_A   （不计平局时）`}
                  </code>
                  <p>
                    这就是「基于正态分布假设<strong>倒推</strong>双方胜负期望」的完整逻辑链：
                  </p>
                  <ul>
                    <li>不是先发明一个奇怪公式再凑故事；</li>
                    <li>
                      而是：<strong>表现 ~ 正态 → 谁高谁赢 → 自动导出 E 只依赖分差与 σ</strong>。
                    </li>
                  </ul>
                  <p>几个立刻能检查的推论：</p>
                  <ul>
                    <li>
                      R<sub>A</sub> = R<sub>B</sub> → E<sub>A</sub> = Φ(0) = 0.5
                    </li>
                    <li>
                      R<sub>A</sub> ≫ R<sub>B</sub> → E<sub>A</sub> → 1，但永远不到「100% 必胜」（钟形两侧无穷薄尾）
                    </li>
                    <li>
                      σ 越大（发挥越飘）→ 同样分差下 E 越接近 0.5（强者优势被噪声冲淡）
                    </li>
                  </ul>

                  <h3>4. 从 Φ 到你在代码里看到的逻辑斯蒂形式</h3>
                  <p>
                    标准正态的 Φ <strong>没有</strong>初等闭式，手算与早期实现都不方便。实践中广泛使用与 Φ
                    形状极像的<strong>逻辑斯蒂（logistic）曲线</strong>做替代（FIDE 等现代实现也常走这条路）。本产品引擎采用的就是：
                  </p>
                  <code className="help-formula" aria-label="逻辑斯蒂期望得分（本产品）">
                    {`E_A = 1 / ( 1 + 10^((R_B − R_A) / S) )
E_B = 1 − E_A

默认 S = scale = 400`}
                  </code>
                  <p>
                    与正态模型的关系可以记成：
                  </p>
                  <ul>
                    <li>
                      <strong>概念上</strong>：E 仍是「分差 → 胜率」的光滑映射，单调、有界 (0,1)、交换双方则对调——与 Φ 版本同一类对象。
                    </li>
                    <li>
                      <strong>标度 S（默认 400）</strong>
                      ：决定「差多少分算大优」。差 400 分时 E ≈ 0.91 / 0.09；差 200 分时强者大约七成多。它对应正态模型里「σ
                      取多大」的量级选择——棋界用 400 是历史约定，口感好记，不是物理常数。
                    </li>
                    <li>
                      <strong>底数 10</strong>
                      ：与「每差一截固定倍率」的书写习惯一致；也可写成自然指数形式，只是换参数。
                    </li>
                  </ul>
                  <p className="help-formula-note">
                    若坚持严格正态，应写 E = Φ((R<sub>A</sub>−R<sub>B</sub>)/(σ√2))；本产品为可复现的浮点实现与业界习惯，使用逻辑斯蒂 +
                    S=400。对业余记分，两者在常见分差下数值非常接近，<strong>故事要从正态讲起，实现用 logistic
                    算</strong>。
                  </p>

                  <h3>5. 更新积分：期望与现实的误差修正</h3>
                  <p>
                    上面的 E 是<strong>赛前</strong>的预测。实际结果记为 S<sub>A</sub>（胜=1，负=0，平=0.5）。积分变动：
                  </p>
                  <code className="help-formula" aria-label="积分更新公式">
                    {`Δ_A = K · ( S_A − E_A )
R_A' = R_A + Δ_A

（严格零和）Δ_B = −Δ_A
R_B' = R_B + Δ_B`}
                  </code>
                  <p>
                    直观含义：把 (S − E) 当作「预测错了多少」。爆冷 → |S−E| 大 → 分跳得狠；结果符合「正态模型下的期望」→ 几乎不动。
                    <strong>K</strong> 是学习率/音量：控制一场噪声最多能改写多少对长期实力的估计。
                  </p>
                  <ul>
                    <li>符合预期 → 变动小</li>
                    <li>弱者爆冷 → 弱者大涨、强者大跌（系统修正「之前高估了分差」）</li>
                    <li>强者战胜弱者 → 几乎不涨（你本来就该赢）</li>
                  </ul>
                  <p>
                    这与许多在线估计同一家族：用新观测不断修正对潜在参数 R 的信念；正态假设负责给出「该信多少」（即 E），K
                    负责「改多狠」。
                  </p>

                  <h3>6. 手算小例子（逻辑斯蒂，S = 400，K = 32）</h3>
                  <p>
                    <strong>势均力敌</strong>：R<sub>A</sub> = R<sub>B</sub> = 1500 → E<sub>A</sub> = 0.5。A 胜：
                  </p>
                  <code className="help-formula">{`Δ_A = 32 × (1 − 0.5) = 16
A → 1516，B → 1484`}</code>
                  <p>
                    <strong>弱者爆冷</strong>：A = 1100，B = 1500（差 400 分）→
                  </p>
                  <code className="help-formula">{`E_A = 1 / (1 + 10^(400/400)) = 1/11 ≈ 0.0909
A 胜：Δ_A ≈ 32 × (1 − 0.0909) ≈ 29.09`}</code>
                  <p className="help-formula-note">
                    与本产品引擎在相同参数下一致（再经四位小数量化）。正态 Φ 版本会给出非常接近的 E，更新叙事相同。
                  </p>

                  <h3>7. 在 ELO-everything 里还多了什么？</h3>
                  <ul>
                    <li>
                      <strong>队伍分（个体本位）</strong>：2v2～5v5 时对一侧成员 R 取平均，再套同一套 E 与
                      Δ——同侧每人完整 Δ。可选「队伍名」只是展示标签，不是独立计分实体。
                    </li>
                    <li>
                      <strong>新手步长</strong>：前若干场更大 K，因为新人的 R 更不确定，需要更快吸收观测。
                    </li>
                    <li>
                      <strong>量化</strong>：Δ 量化到小数点后 4 位，避免浮点毛刺。
                    </li>
                    <li>
                      <strong>时序链</strong>：按对局时间从早到晚更新——每一场的 R 是「截至当时」对潜在实力的估计。
                    </li>
                  </ul>
                  <p>
                    参数见{" "}
                    <a href="/help/params#k-factor">积分步长 K</a>、
                    <a href="/help/params#start-rating">起始分</a>；操作见{" "}
                    <a href="/help/guide#timing">按时间顺序录入</a>。
                  </p>

                  <h3>8. 收束</h3>
                  <p>
                    <strong>Elo 不是魔法分，而是：在「临场表现 ≈ 实力 + 正态噪声」的假设下，由胜负倒推并迭代修正的相对强弱标尺。</strong>
                    正态来自「多因素叠加涨落」这一自然默认；逻辑斯蒂是算得出的孪生曲线；K
                    决定你信新一场有多深。记分时你只需把结果和时间录对——公式由系统代劳。
                  </p>
                </div>
              </details>
            </section>

            <section id="example" className="help-section">
              <h2>小例子（感受一下）</h2>
              <p>下面用「大约」描述，实际数字还受新手期等设置影响。精确算式见上方折叠区。</p>
              <ul>
                <li>
                  <strong>势均力敌</strong>：两人分数接近，甲赢 → 甲涨一截、乙跌一截，幅度中等（K=32 时大约各 16 分）。
                </li>
                <li>
                  <strong>强者战胜弱者</strong>：大家本来就觉得强者该赢 → 强者几乎不涨，弱者少跌一点。
                </li>
                <li>
                  <strong>弱者爆冷赢了</strong>：很意外 → 弱者大涨，强者大跌（差 400 分时，K=32 大约动 29 分）。
                </li>
              </ul>
              <p>所以积分鼓励「敢碰强敌」，而不是只刷弱局。</p>
            </section>

            <section id="where" className="help-section">
              <h2>还用在哪里？</h2>
              <p>
                电竞排位、桌上游戏社群、球类办公室联赛、飞镖与棋牌俱乐部……凡是「两两（或两队）能分出胜负」的，都可以借用这套相对强弱的思路。
              </p>
            </section>

            <section id="in-app" className="help-section">
              <h2>在 ELO-everything 里意味着什么？</h2>
              <p>你是<strong>记录员</strong>：</p>
              <ol>
                <li>创建一场<strong>赛事</strong>（一组人共用一套排名）；</li>
                <li>添加<strong>选手</strong>姓名（选手本人不用注册）；</li>
                <li>按真实时间登记对局，保存草稿，再<strong>发布</strong>；</li>
                <li>系统更新每位选手的<strong>积分</strong>与<strong>排名</strong>。</li>
              </ol>
              <p>选手不必懂 ELO；你只要把结果和时间录对即可。</p>
            </section>

            <section id="limits" className="help-section">
              <h2>它不保证什么？</h2>
              <ul>
                <li>不是「绝对实力真理」，只是根据已录入对局推出来的相对分数。</li>
                <li>人很少、场次很少时，分数会抖，这很正常。</li>
                <li>
                  <strong>乱序录入会算歪</strong>：同一人多场时，后一场要基于前一场更新后的分。请看{" "}
                  <a href="/help/guide#timing">使用说明 · 按时间顺序录入</a>。
                </li>
              </ul>
            </section>

            <section id="next" className="help-section">
              <h2>接下来</h2>
              <p>若你已经明白「积分是相对强弱的分数」，可以开始用产品；若要逐步操作，请看使用说明。</p>
            </section>

            <HelpFooterNav
              prev={{ href: "/help", label: "帮助目录" }}
              next={{ href: "/help/guide", label: "如何使用本应用" }}
            />
          </div>
        </div>
      </article>
    </div>
  );
}
