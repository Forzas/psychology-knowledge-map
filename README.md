# Psychology Knowledge Map

一个帮助整理**心理学课程知识点**的静态网页。

你可以把：
- 课程
- 知识点
- 知识点之间的关系
- 知识点在不同课程中的重复出现

都放进同一张图里，得到一个比较直观的**知识点拓扑图 / 思维导图风格展示**。

## 功能

- 课程节点 + 知识点节点可视化
- 课程 → 知识点关系展示
- 知识点 ↔ 知识点关系展示
- 按课程筛选图谱
- 按关系类型筛选图谱
- 搜索课程 / 知识点
- 点击节点查看详情
- 直接编辑 JSON 批量维护数据
- 支持 JSON 文件导入 / 导出
- 支持 localStorage，本地刷新不丢数据
- 支持导入 Markdown 课程笔记，自动生成课程 / 知识点 / 关系
- 支持关系类型自动着色（影响、包含、对比、一般关联）

## 使用方式

直接打开 `index.html` 即可。

如果你想本地起个简单服务，也可以：

```bash
python -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

## 数据结构

```json
{
  "courses": [
    {
      "id": "course-cognitive",
      "name": "认知心理学基础",
      "description": "课程说明"
    }
  ],
  "concepts": [
    {
      "id": "concept-working-memory",
      "name": "工作记忆",
      "courseIds": ["course-cognitive"],
      "description": "知识点说明"
    }
  ],
  "relations": [
    {
      "id": "rel-1",
      "source": "concept-working-memory",
      "target": "concept-attention",
      "label": "影响"
    }
  ]
}
```

## Markdown 导入格式

```markdown
# 课程：社会心理学
课程说明：研究个体如何受到他人、群体与社会情境影响。

## 知识点：归因偏差
说明：解释他人行为时常见的系统性偏差。
关联：图式 | 受影响于
关联：基本归因错误 | 包含

## 知识点：从众
说明：个体因群体压力而改变行为或判断。
```

规则：
- `# 课程：...` 表示一门课程
- `课程说明：...` 可选
- `## 知识点：...` 表示一个知识点
- `说明：...` 可选
- `关联：目标知识点 | 关系名称` 可选；不写关系名称时默认记为“关联”
- `追加导入` 会把新内容合并到现有图谱里

## 部署

仓库已内置 GitHub Pages workflow：
- push 到 `master` 后会自动触发部署
- 如果仓库 Pages 未开启，首次可能需要在 GitHub 仓库设置中确认使用 **GitHub Actions** 作为 Pages source

理论上的站点地址会是：

```text
https://forzas.github.io/psychology-knowledge-map/
```

## 适合下一步扩展

- 从课程笔记自动抽取知识点
- 支持导入 Markdown / CSV
- 支持保存多份专题图谱
- 支持按心理学流派、主题、人物筛选
- 支持时间线 / 学习进度结合
