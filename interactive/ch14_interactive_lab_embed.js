/**
 * 合并到 assets/js/interactive-chapters.js 时，可把此函数挂到
 * data-lab="ch14-calibration-transfer" 的渲染分派中。
 *
 * 该函数依赖中央站点提供 .interactive-lab 容器；完整独立版本见
 * ch14_interactive_lab.html。
 */
function renderCh14CalibrationTransfer(root) {
  root.innerHTML = `
    <div class="ch14-lab">
      <p><strong>判断顺序：</strong>硬件量值链 → 差异结构 → 迁移方法 → 独立目标域验证。</p>
      <fieldset>
        <legend>差异更像哪一种？</legend>
        <label><input type="radio" name="ch14-difference" value="additive"> 全局加性/乘性差异</label>
        <label><input type="radio" name="ch14-difference" value="smooth" checked> 全局平滑谱响应差异</label>
        <label><input type="radio" name="ch14-difference" value="local"> 局部峰形/波长依赖差异</label>
      </fieldset>
      <fieldset>
        <legend>选择方法</legend>
        <label><input type="radio" name="ch14-method" value="slope"> 斜率—偏差</label>
        <label><input type="radio" name="ch14-method" value="ds" checked> DS</label>
        <label><input type="radio" name="ch14-method" value="pds"> PDS</label>
      </fieldset>
      <label><input type="checkbox" id="ch14-hardware"> 已完成硬件校准</label>
      <label><input type="checkbox" id="ch14-independent"> 使用独立目标域测试集</label>
      <button type="button" class="ch14-check">检查方案</button>
      <div class="ch14-feedback" aria-live="polite"></div>
    </div>
  `;

  const feedback = root.querySelector(".ch14-feedback");
  root.querySelector(".ch14-check").addEventListener("click", () => {
    const difference = root.querySelector('input[name="ch14-difference"]:checked').value;
    const method = root.querySelector('input[name="ch14-method"]:checked').value;
    const hardware = root.querySelector("#ch14-hardware").checked;
    const independent = root.querySelector("#ch14-independent").checked;
    const best = {
      additive: ["slope", "ds"],
      smooth: ["ds"],
      local: ["pds"]
    }[difference];
    const ok = hardware && independent && best.includes(method);
    feedback.textContent = ok
      ? "通过：硬件前提、方法选择与独立验证均成立。"
      : `未通过：硬件校准=${hardware}；独立验证=${independent}；当前差异首选 ${best.join(" 或 ")}。`;
    feedback.dataset.status = ok ? "pass" : "revise";
  });
}

