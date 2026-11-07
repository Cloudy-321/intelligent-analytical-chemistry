/*
 * 第14章互动组件片段。
 *
 * 用法：本文件不是独立脚本。其中的 renderChapterFourteen(root) 需要粘贴到
 * assets/js/interactive-chapters.js 的 IIFE 内部、function mountLabs() 之前，
 * 并在 mountLabs() 中增加分派：
 *   if (root.getAttribute('data-lab') === 'ch14-calibration-transfer') renderChapterFourteen(root);
 *
 * 函数依赖中央脚本已有的 readState / saveState / clearState / progressDots /
 * feedbackBox / gaussian，以及 assets/theme.css 中的 .lab-* 样式。
 */
  function renderChapterFourteen(root) {
    var storageKey = 'ch14-calibration-transfer';
    var initial = { hardware: false, difference: '', method: '', validation: '', checked: false };
    var state = readState(storageKey, initial);

    var differences = [
      { id: 'additive', label: '全局加性 / 乘性差异', detail: '峰位基本重合，主要是强度与截距整体偏移。' },
      { id: 'smooth', label: '全局平滑谱响应差异', detail: '峰位重合、峰宽相近，增益随波长缓慢变化。' },
      { id: 'local', label: '局部峰形 / 波长依赖差异', detail: '某一波段的峰宽或峰高发生明显改变。' }
    ];
    var methods = [
      { id: 'direct', label: '直接套用主仪器模型', detail: '不做任何校正，把 B 的光谱直接送进 A 的模型。' },
      { id: 'slope', label: '斜率—偏差校正（slope/bias）', detail: '只用传递样品修正预测值的尺度与截距。' },
      { id: 'ds', label: '全局 DS（直接标准化）', detail: '在全部波长上学习一条主从映射。' },
      { id: 'pds', label: 'PDS（分段直接标准化）', detail: '在每个局部波长窗口分别学习映射。' }
    ];
    var validations = [
      { id: 'transfer', label: '参与迁移拟合的传递样品', detail: '这些样品已经用于估计 DS / PDS 的映射参数。' },
      { id: 'independent', label: '未参与训练与迁移的独立目标域样品', detail: '更接近下周部署到 B 上的真实条件。' }
    ];

    var answer = { difference: 'smooth', method: 'ds', validation: 'independent' };
    var acceptableMethod = { direct: false, slope: false, ds: true, pds: true };

    function pick(items, id) {
      return items.filter(function (item) { return item.id === id; })[0] || items[0];
    }

    function labelOf(items, id) {
      return id ? pick(items, id).label : '未选择';
    }

    function spectra(kind) {
      var master = [];
      var slave = [];
      for (var index = 0; index <= 200; index += 1) {
        var x = 1100 + index * 6.5;
        var m = gaussian(x, 1450, 65, 0.95) + gaussian(x, 1900, 95, 0.68) + gaussian(x, 2180, 120, 0.42);
        var s;
        if (kind === 'additive') {
          s = m * 1.10 + 0.06;
        } else if (kind === 'local') {
          s = m * 1.02 + gaussian(x, 1450, 105, 0.24) - gaussian(x, 1850, 52, 0.20);
        } else {
          s = m * (0.90 + 0.14 * Math.exp(-0.5 * Math.pow((x - 1950) / 420, 2)));
        }
        master.push({ x: x, y: m });
        slave.push({ x: x, y: s });
      }
      return { master: master, slave: slave };
    }

    function plot(selected) {
      var measured = spectra('smooth');
      var hypothesis = selected && selected !== 'smooth' ? spectra(selected).slave : null;
      var width = 650;
      var height = 230;
      var pad = { left: 46, right: 18, top: 34, bottom: 34 };
      var values = measured.master.concat(measured.slave).concat(hypothesis || []).map(function (point) { return point.y; });
      var min = Math.min.apply(null, values);
      var max = Math.max.apply(null, values);
      var range = max - min || 1;
      var innerHeight = height - pad.top - pad.bottom;

      function pathOf(points, color, dashed) {
        var path = points.map(function (point, index) {
          var px = pad.left + index * (width - pad.left - pad.right) / (points.length - 1);
          var py = height - pad.bottom - (point.y - min) / range * innerHeight;
          return (index === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1);
        }).join(' ');
        return '<path d="' + path + '" class="lab-spectrum-line" stroke="' + color + '" stroke-width="2.6"'
          + (dashed ? ' stroke-dasharray="5 4" stroke-opacity="0.8"' : '') + ' />';
      }

      var grid = [0.2, 0.5, 0.8].map(function (ratio) {
        var y = pad.top + ratio * innerHeight;
        return '<line x1="' + pad.left + '" x2="' + (width - pad.right) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="lab-gridline" />';
      }).join('');

      var legend = '<line x1="196" x2="218" y1="16" y2="16" stroke="#0a76aa" stroke-width="2.6" /><text x="224" y="20" class="lab-axis-text">主仪器 A</text>'
        + '<line x1="316" x2="338" y1="16" y2="16" stroke="#d56643" stroke-width="2.6" /><text x="344" y="20" class="lab-axis-text">实测 B</text>';
      if (hypothesis) {
        legend += '<line x1="416" x2="438" y1="16" y2="16" stroke="#7b8794" stroke-width="2.6" stroke-dasharray="5 4" /><text x="444" y="20" class="lab-axis-text">假设谱形</text>';
      }

      var caption = '主仪器 A 与 12 个传递样品实测 B 的近红外光谱对比'
        + (hypothesis ? '，虚线为假设' + pick(differences, selected).label + '时 B 应有的形状' : '')
        + '；峰位重合、峰宽相近，B 在 1900 nm 附近增益偏高。';

      return '<svg class="lab-spectrum" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + caption + '">'
        + '<rect width="' + width + '" height="' + height + '" rx="10" class="lab-plot-bg" />' + grid + legend
        + pathOf(measured.master, '#0a76aa', false)
        + pathOf(measured.slave, '#d56643', false)
        + (hypothesis ? pathOf(hypothesis, '#7b8794', true) : '')
        + '<text x="' + pad.left + '" y="' + (height - 10) + '" class="lab-axis-text">1100</text>'
        + '<text x="' + (width / 2 - 26) + '" y="' + (height - 10) + '" class="lab-axis-text">波长 / nm</text>'
        + '<text x="' + (width - 58) + '" y="' + (height - 10) + '" class="lab-axis-text">2400</text>'
        + '<text x="12" y="' + (pad.top + 8) + '" class="lab-axis-text">响应</text></svg>';
    }

    function optionMarkup(items, selectedId, action, statusOf) {
      return items.map(function (item, index) {
        var active = item.id === selectedId;
        var status = statusOf ? statusOf(item) : '';
        return '<button type="button" class="lab-option' + (active ? ' is-selected' : '') + status + '" '
          + 'data-action="' + action + '" data-value="' + item.id + '" aria-pressed="' + (active ? 'true' : 'false') + '">'
          + '<span class="lab-option-letter">' + String.fromCharCode(65 + index) + '</span>'
          + '<span><strong>' + item.label + '</strong><small>' + item.detail + '</small></span></button>';
      }).join('');
    }

    function differenceStatus(item) {
      if (!state.checked) return '';
      if (item.id === answer.difference) return ' is-correct';
      return state.difference === item.id ? ' is-incorrect' : '';
    }

    function methodStatus(item) {
      if (!state.checked) return '';
      if (item.id === answer.method) return ' is-correct';
      if (state.method === item.id) return acceptableMethod[item.id] ? '' : ' is-incorrect';
      return '';
    }

    function validationStatus(item) {
      if (!state.checked) return '';
      if (item.id === answer.validation) return ' is-correct';
      return state.validation === item.id ? ' is-incorrect' : '';
    }

    function draw() {
      var gates = [
        Boolean(state.hardware),
        state.difference === answer.difference,
        state.method === answer.method,
        state.validation === answer.validation
      ];
      var readyCount = gates.filter(function (pass) { return pass; }).length;
      var allPass = readyCount === 4;

      var differenceFeedback = state.checked
        ? feedbackBox(gates[1] ? 'success' : 'warning', gates[1] ? '差异结构判断正确' : '先把差异结构看清，再谈迁移方法', gates[1]
          ? '峰位重合、峰宽相近、增益随波长缓慢变化——这是典型的全局平滑谱响应差异，对应“整条谱的乘法型漂移”，而不是个别峰的形变。'
          : '本案例中 B 的峰位与峰宽基本不变，只有增益沿波长缓慢变化。判成加性差异会漏掉波长依赖；判成局部差异，会把 PDS 用在没有局部形变的数据上。')
        : '';

      var methodFeedback = state.checked
        ? feedbackBox(gates[2] ? 'success' : 'warning', gates[2] ? '迁移方法与差异结构一致' : '这个方法解决不了当前的差异', gates[2]
          ? 'DS 用少量传递样品在全部波长上学习一条映射，正好对应平滑的全局增益差异；若差异确属局部、且传递样品足够多，才轮到 PDS。'
          : acceptableMethod[state.method]
            ? 'PDS 也能工作，但它在每个窗口单独拟合，需要更多传递样品；本案例只有 12 个样品，容易把噪声学成映射。'
            : '斜率—偏差只修正预测值的尺度与截距，改变不了“不同波长被不同增益放大”这一事实；直接套用则把仪器差异整体算进浓度。')
        : '';

      var assessment = state.checked
        ? feedbackBox(allPass ? 'success' : 'warning', allPass ? '这条迁移链可以被审查' : '迁移链仍有断点（' + readyCount + ' / 4）', allPass
          ? '硬件量值链先闭合，差异结构被正确识别，方法与结构匹配，最终误差报告在未参与拟合的独立目标域样品上。这四步顺序不能互换：任何一步跳过，后面的误差数字都不再代表 B 上的真实性能。'
          : '请回看标红环节。最常见的错误是先用 DS/PDS 把曲线“对齐”，再拿传递样品上的误差当最终结果——那是拟合残差，不是迁移性能。')
        : '';

      root.innerHTML = '<section class="lab-shell lab-shell--ch14" aria-labelledby="ch14-lab-title">'
        + '<header class="lab-header"><div><p class="lab-eyebrow">互动案例 · 约 15 分钟 · 浏览器本地保存进度</p>'
        + '<h3 id="ch14-lab-title">任务十四：主仪器模型能直接部署到从仪器吗？</h3>'
        + '<p>你是负责方法转移的分析人员。模型建在 A 上，下周要在 B 上报告 60 个新样品的浓度。请依次决定：量值链、差异结构、迁移方法、验证集合。</p></div>'
        + '<div class="lab-progress" aria-label="已完成 ' + readyCount + ' / 4 个迁移决策">' + progressDots(readyCount, 4) + '<span>' + readyCount + ' / 4</span></div></header>'
        + '<div class="lab-brief"><strong>现场简报</strong><ul>'
        + '<li>A、B 为同型号近红外光谱仪，不同批次；A 上已有 PLS 浓度模型与完整验证记录。</li>'
        + '<li>在 B 上重测了 12 个传递样品：峰位基本重合，峰宽变化不明显，B 的响应在 1900 nm 附近整体偏高，且随波长缓慢变化。</li>'
        + '<li>现场只允许再测少量样品；监管方要的是 B 上“未来样品”的误差，而不是这 12 个样品拟合得多好。</li>'
        + '</ul></div>'

        + '<article class="lab-stage"><div class="lab-stage-number">1</div><div class="lab-stage-content">'
        + '<p class="lab-stage-kicker">前提</p><h4>先闭合硬件与量值链</h4>'
        + '<p>在讨论任何数学迁移之前，B 的波长、强度、分辨率与检测器响应是否已经可溯源？</p>'
        + '<div class="lab-chip-grid"><button type="button" class="lab-chip' + (state.hardware ? ' is-selected' : '') + (state.checked ? (state.hardware ? ' is-correct' : ' is-incorrect') : '') + '" '
        + 'data-action="ch14-hardware" aria-pressed="' + (state.hardware ? 'true' : 'false') + '"><span aria-hidden="true">' + (state.hardware ? '✓' : '+') + '</span> 已完成波长、强度、分辨率与检测器响应校准</button></div>'
        + (state.checked && !state.hardware ? feedbackBox('warning', '这一步不能用算法替代', 'DS / PDS 只能对齐“已经正确测量的光谱”。波长轴偏了或检测器饱和了，迁移函数会把仪器故障学成一个漂亮的映射。') : '')
        + '</div></article>'

        + '<article class="lab-stage"><div class="lab-stage-number">2</div><div class="lab-stage-content">'
        + '<p class="lab-stage-kicker">诊断</p><h4>主从差异更像哪一种？</h4>'
        + '<p>下图是 12 个传递样品的实测对比。选定一种描述后，灰色虚线会叠加该结构下 B 应有的形状，用来和实测曲线比对。</p>'
        + '<div class="lab-option-grid">' + optionMarkup(differences, state.difference, 'ch14-difference', differenceStatus) + '</div>'
        + '<div class="lab-plot-wrap">' + plot(state.difference) + '<div class="lab-plot-note"><strong>' + labelOf(differences, state.difference) + '</strong><p>'
        + (state.difference ? pick(differences, state.difference).detail + (state.difference === answer.difference ? '' : ' —— 请把它和实测橙线比对：峰位、峰宽是否真的变了？')
          : '还没有选择差异结构。先看橙线与蓝线的差别出现在哪里：整体高度、随波长的增益，还是某个峰的宽度。')
        + '</p></div></div>'
        + differenceFeedback
        + '</div></article>'

        + '<article class="lab-stage"><div class="lab-stage-number">3</div><div class="lab-stage-content">'
        + '<p class="lab-stage-kicker">方法</p><h4>选择迁移方式</h4>'
        + '<p>只有 12 个传递样品。你打算怎样把 A 的模型用到 B 上？</p>'
        + '<div class="lab-option-grid">' + optionMarkup(methods, state.method, 'ch14-method', methodStatus) + '</div>'
        + methodFeedback
        + '</div></article>'

        + '<article class="lab-stage"><div class="lab-stage-number">4</div><div class="lab-stage-content">'
        + '<p class="lab-stage-kicker">验证</p><h4>用哪个集合报告最终误差？</h4>'
        + '<p>RMSEP 写进报告之前，先决定它来自哪个集合。</p>'
        + '<div class="lab-option-grid">' + optionMarkup(validations, state.validation, 'ch14-validation', validationStatus) + '</div>'
        + (state.checked && state.validation === 'transfer' ? feedbackBox('warning', '传递样品不能充当独立测试集', '它们参与了映射参数（甚至斜率—偏差系数）的估计，残差里已经不含“没见过 B”的成分。必须另留未参与拟合的目标域样品。') : '')
        + '</div></article>'

        + '<div class="lab-actions"><button type="button" class="lab-primary" data-action="ch14-check">检查迁移方案</button>'
        + '<button type="button" class="lab-secondary" data-action="ch14-reset">重置本题</button></div>' + assessment
        + '<aside class="lab-note"><strong>带走的原则：</strong>迁移不是“把曲线对齐”。顺序是硬件量值链 → 差异结构 → 迁移方法 → 独立目标域验证；报告的误差只能来自最后一步，而且必须排除参与拟合的样品。</aside>'
        + '</section>';

      root.setAttribute('data-ch14-record', '硬件=' + (state.hardware ? '已校准' : '未校准')
        + '；差异=' + labelOf(differences, state.difference)
        + '；方法=' + labelOf(methods, state.method)
        + '；验证=' + labelOf(validations, state.validation));
    }

    root.onclick = function (event) {
      var button = event.target.closest('[data-action]');
      if (!button || !root.contains(button)) return;
      var action = button.getAttribute('data-action');
      var value = button.getAttribute('data-value');
      if (action === 'ch14-hardware') {
        state.hardware = !state.hardware;
        state.checked = false;
      } else if (action === 'ch14-difference') {
        state.difference = value;
        state.checked = false;
      } else if (action === 'ch14-method') {
        state.method = value;
        state.checked = false;
      } else if (action === 'ch14-validation') {
        state.validation = value;
        state.checked = false;
      } else if (action === 'ch14-check') {
        state.checked = true;
      } else if (action === 'ch14-reset') {
        clearState(storageKey);
        state = Object.assign({}, initial);
        saveState(storageKey, state);
        draw();
        return;
      } else {
        return;
      }
      saveState(storageKey, state);
      draw();
    };
    draw();
  }
