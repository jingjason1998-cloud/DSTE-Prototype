# KPI 指标树 v4 — 思维导图式层级树 PRD

## 参考原型

用户手绘图：自上而下的思维导图结构
- 根节点在顶部居中
- 子节点向下展开，同级节点**横向并排**
- 父子之间用线条连接

```
              [ 销售额 ]
                  |
      +-----------+-----------+
      |           |           |
  [战区销售]   [垂类客户]   [产品服务]
      |
  +---+---+
  |       |
[山东]  [上海]
```

## 布局设计

### DOM 结构
```
.omp-kpi-tree-root (flex-col, align-center, overflow-x:auto)
  └── .omp-kpi-tree-node (flex-col, align-center)
        ├── .omp-kpi-card (节点卡片，横向思维导图节点)
        └── .omp-kpi-children-row (flex-row, gap:20px, 子节点横向排列)
              ├── .omp-kpi-tree-node
              │     ├── .omp-kpi-card
              │     └── .omp-kpi-children-row
              └── .omp-kpi-tree-node
                    ├── .omp-kpi-card
                    └── .omp-kpi-children-row
```

### CSS
```css
.omp-kpi-tree-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: auto;
  padding: 24px;
  min-height: 600px;
}
.omp-kpi-tree-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
/* 子节点横向容器 */
.omp-kpi-children-row {
  display: flex;
  flex-direction: row;
  gap: 20px;
  margin-top: 32px;
  padding: 0 12px;
  position: relative;
}
```

## 连接线设计（CSS 简化版）

采用三层线条模拟思维导图连接效果：

1. **父→横线分叉点**：父节点卡片底部中心向下的竖线
2. **横线**：贯穿子节点容器顶部（第一个子节点左边缘到最后一个子节点右边缘）
3. **横线→子节点**：每个子节点卡片顶部中心向上的竖线

```css
/* 父节点下方竖线（连接到横线） */
.omp-kpi-card.has-children::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -16px;
  width: 2px;
  height: 16px;
  background: #D9D9D9;
  transform: translateX(-50%);
}

/* 子节点容器顶部横线 */
.omp-kpi-children-row::before {
  content: '';
  position: absolute;
  top: -16px;
  left: 12px;
  right: 12px;
  height: 2px;
  background: #D9D9D9;
}

/* 每个子节点上方竖线（从横线连接到卡片） */
.omp-kpi-tree-node > .omp-kpi-card::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -16px;
  width: 2px;
  height: 16px;
  background: #D9D9D9;
  transform: translateX(-50%);
}
```

> 注：由于 flex 布局动态特性，精确 SVG 路径需要 JS 计算坐标。采用 CSS 伪元素方案在节点数量少（<20）时视觉效果可接受。如需完美还原手绘图，可后续升级为 JS 动态 SVG 连线。

## 卡片样式

思维导图节点卡片（区别于当前纵向列表卡片）：
- 固定宽度（如 180px），不再占满整行
- 圆角 12px，轻微阴影
- 内容精简：指标名 + 完成度百分比 + 状态色条
- 展开/收起按钮在卡片内右下角

```css
.omp-kpi-card.mindmap-node {
  width: 180px;
  min-height: 80px;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #E8E8E8;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  position: relative;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.omp-kpi-card.mindmap-node:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
/* 状态色条（顶部） */
.omp-kpi-card.mindmap-node.status-achieved { border-top: 3px solid #52C41A; }
.omp-kpi-card.mindmap-node.status-warning { border-top: 3px solid #FAAD14; }
.omp-kpi-card.mindmap-node.status-lagging { border-top: 3px solid #F5222D; }
```

## 交互设计

1. **点击卡片** = 展开/收起子节点（替代单独的展开按钮）
2. **叶子节点** = 点击打开详情弹窗
3. **展开/收起动画**：子节点容器高度从 0 过渡到 auto（保持当前 grid 动画方案）
4. **根节点默认展开**：L0 自动展开，保持当前行为

## 数据与渲染

`omp_renderKpiTree` 改为递归生成思维导图式 HTML：

```javascript
function omp_renderKpiTreeMindmap(kpis, indicators, ...) {
  const { roots, childrenMap } = omp_kpiBuildTree(kpis);
  
  function renderNode(kpi) {
    const hasChildren = childrenMap[kpi.id]?.length > 0;
    const isExpanded = expandedIds.has(kpi.id);
    const childrenHtml = hasChildren && isExpanded 
      ? `<div class="omp-kpi-children-row">${childrenMap[kpi.id].map(renderNode).join('')}</div>`
      : '';
    
    return `<div class="omp-kpi-tree-node">
      <div class="omp-kpi-card mindmap-node ${hasChildren ? 'has-children' : ''} status-${kpi.status}"
           data-id="${kpi.id}" data-level="${kpi.level}"
           onclick="window.omp_toggleExpand('${kpi.id}')">
        <div class="node-name">${ind.name}（${kpi.dept}）</div>
        <div class="node-progress">${kpi.actual}/${kpi.target}</div>
        ${hasChildren ? `<span class="expand-icon">${isExpanded ? '−' : '+'}</span>` : ''}
      </div>
      ${childrenHtml}
    </div>`;
  }
  
  return `<div class="omp-kpi-tree-root">${roots.map(renderNode).join('')}</div>`;
}
```

## 回退方案

如果思维导图式布局在移动端表现不佳（节点过多导致横向溢出），可以增加：
- 水平滚动（`overflow-x: auto` 已在根容器设置）
- 双击/长按缩放
- 或者提供一个"切换视图"按钮，在思维导图和当前纵向列表之间切换

## 测试要点

1. 根节点在页面顶部居中
2. L1 节点在根节点下方横向排列
3. L2 节点在各自父节点下方横向排列
4. 展开/收起动画正常
5. 点击卡片切换展开状态
6. 叶子节点点击打开详情
7. 连接线（竖线+横线）视觉正确
