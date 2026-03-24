/**
 * Claude Context Injector — 通用浮动按钮组件
 * 自动检测当前页面类型，生成适配的prompt上下文
 * 使用方式：在任意HTML页面</body>前加 <script src="ctx-injector.js"></script>
 */
(function(){
  // === 1. 检测页面类型和上下文 ===
  var title = document.title || '';
  var path = location.pathname;
  var filename = path.split('/').pop();
  var h1 = document.querySelector('h1');
  var h1Text = h1 ? h1.textContent.replace(/\s+/g,' ').trim().substring(0,80) : title;

  // 检测页面类型
  var pageType = 'unknown';
  var pageName = filename;
  var pageContext = '';

  if (filename.indexOf('W12') >= 0 && filename.indexOf('v3') >= 0) {
    pageType = 'hub';
    pageName = 'W12 Weekly Synthesis Hub';
    pageContext = '当前Priority Queue:\n- P0: Sell-side卖侧生命周期（5天零执行）\n- P1: 验证NVDA/AVGO/ARM/ASML候选 + Dashboard接入认知分析\n- DONE: Cognitive Agents V2 (90%), Memory Sharing (100%)';
  } else if (path.indexOf('/projects/') >= 0) {
    pageType = 'project';
    pageName = h1Text;
    // 提取项目状态
    var badges = [];
    document.querySelectorAll('.badge, .badge-sm, [class*="badge"]').forEach(function(b){
      var t = b.textContent.trim();
      if (t.length < 30) badges.push(t);
    });
    var stats = [];
    document.querySelectorAll('.s-value, .stat-value, .metric-value').forEach(function(s){
      var label = s.closest('.s-cell, .portfolio-stat, .metric');
      var lbl = label ? label.textContent.replace(s.textContent,'').trim().substring(0,20) : '';
      stats.push(lbl + ': ' + s.textContent.trim());
    });
    pageContext = '项目状态: ' + badges.join(' · ') + '\n关键指标: ' + stats.slice(0,6).join(' | ');
  } else if (filename.indexOf('NODE_') >= 0 && filename.indexOf('metacognition') >= 0) {
    pageType = 'metacognition';
    pageName = h1Text;
    pageContext = '这是一个28轮元思考页面，包含9个Phase的认知诊断过程。';
  } else if (filename.indexOf('NODE_') >= 0) {
    pageType = 'node-report';
    pageName = h1Text;
    // 提取节点关键信息
    var kpis = [];
    document.querySelectorAll('.kpi-value').forEach(function(k){
      kpis.push(k.textContent.trim());
    });
    pageContext = '认知节点报告，包含Phase 0→2 + 认知代理人 + 三角验证 + 信号传导链。\nKPI: ' + kpis.join(' | ');
  } else if (filename.indexOf('semiconductor_hub') >= 0) {
    pageType = 'semi-hub';
    pageName = 'Semiconductor Research Hub';
    pageContext = '半导体研究中枢：6个供应链节点 × 16个认知代理人。';
  } else if (filename.indexOf('sources_') >= 0 || filename.indexOf('_v4') >= 0) {
    pageType = 'source-map';
    pageName = h1Text;
    pageContext = '素材策展地图V4，包含右侧META/知识注解。';
  } else {
    pageType = 'other';
    pageName = h1Text || title;
    pageContext = '';
  }

  // === 2. 构建基础prompt ===
  var relativePath = path.replace(/^.*\/(observatory|trade-pipeline)/, '~/$1');
  var base = '我正在看页面: ' + pageName + '\n文件: ' + relativePath + '\n\n' + (pageContext ? pageContext + '\n\n' : '');

  var tpls = {
    adjust: base + '请帮我调整这个页面中的以下内容：\n',
    fix:    base + '我发现这个页面有以下问题需要修复：\n',
    add:    base + '请在这个页面中新增以下功能/板块：\n',
    review: base + '请审查这个页面，检查数据准确性和设计质量：\n'
  };

  // === 3. 注入CSS ===
  var style = document.createElement('style');
  style.textContent = '\
.ctx-fab{position:fixed;right:1.25rem;bottom:1.25rem;z-index:9999;width:48px;height:48px;border-radius:50%;border:1px solid #34343a;background:#141516;color:#d0d6e0;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 14px rgba(0,0,0,.45);transition:border-color .15s,transform .15s;font-family:system-ui;}\
.ctx-fab:hover{border-color:#f8a848;color:#f8a848;transform:scale(1.08);}\
.ctx-panel{position:fixed;right:1.25rem;bottom:5rem;z-index:9998;width:380px;max-height:70vh;background:#0f1011;border:1px solid #34343a;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.55);padding:1.25rem;display:none;flex-direction:column;gap:.75rem;font-family:"Inter",system-ui,sans-serif;}\
.ctx-panel.open{display:flex;}\
.ctx-panel h4{margin:0;font-size:.85rem;font-weight:590;color:#f8a848;letter-spacing:-.01em;}\
.ctx-panel .ctx-sub{margin:0;font-size:.68rem;color:#62666d;line-height:1.4;}\
.ctx-page-tag{display:inline-block;font-size:.6rem;padding:.1rem .4rem;border-radius:3px;background:rgba(248,168,72,.1);color:#f8a848;font-weight:510;margin-left:.4rem;text-transform:uppercase;letter-spacing:.03em;}\
.ctx-ta{width:100%;min-height:110px;background:#08090a;color:#d0d6e0;border:1px solid #23252a;border-radius:8px;padding:.65rem .75rem;font-size:.75rem;font-family:"SF Mono","Menlo",monospace;line-height:1.55;resize:vertical;}\
.ctx-ta:focus{outline:none;border-color:#f8a848;}\
.ctx-chips{display:flex;flex-wrap:wrap;gap:.3rem;}\
.ctx-chip{font-size:.63rem;padding:.15rem .4rem;border-radius:4px;background:rgba(248,168,72,.06);color:#8a8f98;border:1px solid #23252a;cursor:pointer;transition:border-color .12s;}\
.ctx-chip:hover{border-color:#f8a848;color:#f8a848;}\
.ctx-chip.active{border-color:#f8a848;color:#f8a848;background:rgba(248,168,72,.1);}\
.ctx-row{display:flex;gap:.5rem;align-items:center;}\
.ctx-btn{flex:1;padding:.4rem 0;border:1px solid #34343a;border-radius:6px;background:#141516;color:#d0d6e0;font-size:.72rem;font-weight:510;cursor:pointer;transition:border-color .12s,color .12s;}\
.ctx-btn:hover{border-color:#f8a848;color:#f8a848;}\
.ctx-btn.primary{background:rgba(248,168,72,.1);border-color:rgba(248,168,72,.35);color:#f8a848;}\
.ctx-ok{font-size:.7rem;color:#4caf50;opacity:0;transition:opacity .3s;}\
.ctx-ok.show{opacity:1;}\
@media(max-width:500px){.ctx-panel{width:calc(100vw - 2rem);right:1rem;}}';
  document.head.appendChild(style);

  // === 4. 注入HTML ===
  var fab = document.createElement('button');
  fab.className = 'ctx-fab';
  fab.id = 'ctxFab';
  fab.title = 'Claude Context Injector';
  fab.textContent = '💬';
  document.body.appendChild(fab);

  var panel = document.createElement('div');
  panel.className = 'ctx-panel';
  panel.id = 'ctxPanel';
  panel.innerHTML = '\
<h4>💬 Claude Context<span class="ctx-page-tag">' + pageType + '</span></h4>\
<p class="ctx-sub">' + pageName.substring(0,50) + '</p>\
<div class="ctx-chips">\
  <span class="ctx-chip active" data-tpl="adjust">调整内容</span>\
  <span class="ctx-chip" data-tpl="fix">修复问题</span>\
  <span class="ctx-chip" data-tpl="add">新增功能</span>\
  <span class="ctx-chip" data-tpl="review">审查质量</span>\
</div>\
<textarea class="ctx-ta" id="ctxTa"></textarea>\
<div class="ctx-row">\
  <button class="ctx-btn primary" id="ctxCopy">📋 复制到剪贴板</button>\
  <button class="ctx-btn" id="ctxReset">重置</button>\
  <span class="ctx-ok" id="ctxOk">✓ 已复制</span>\
</div>';
  document.body.appendChild(panel);

  // === 5. 绑定事件 ===
  var ta = document.getElementById('ctxTa');
  ta.value = tpls.adjust;

  fab.addEventListener('click', function(){ panel.classList.toggle('open'); });

  panel.querySelectorAll('.ctx-chip').forEach(function(c){
    c.addEventListener('click', function(){
      panel.querySelectorAll('.ctx-chip').forEach(function(x){ x.classList.remove('active'); });
      c.classList.add('active');
      ta.value = tpls[c.dataset.tpl];
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
  });

  document.getElementById('ctxCopy').addEventListener('click', function(){
    navigator.clipboard.writeText(ta.value).then(function(){
      var ok = document.getElementById('ctxOk');
      ok.classList.add('show');
      setTimeout(function(){ ok.classList.remove('show'); }, 2000);
    });
  });

  document.getElementById('ctxReset').addEventListener('click', function(){
    var active = panel.querySelector('.ctx-chip.active');
    ta.value = tpls[active ? active.dataset.tpl : 'adjust'];
  });

  document.addEventListener('click', function(e){
    if (!panel.contains(e.target) && e.target !== fab) panel.classList.remove('open');
  });
})();
