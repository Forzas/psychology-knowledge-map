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
- 点击节点查看详情
- 直接编辑 JSON 批量维护数据
- 支持 localStorage，本地刷新不丢数据

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

## 适合下一步扩展

- 从课程笔记自动抽取知识点
- 支持导入 Markdown / CSV
- 支持保存多份专题图谱
- 支持按心理学流派、主题、人物筛选
- 支持时间线 / 学习进度结合
