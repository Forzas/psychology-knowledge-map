window.DEFAULT_DATA = {
  courses: [
    {
      id: "course-cognitive",
      name: "认知心理学基础",
      description: "关注知觉、注意、记忆、思维与决策的核心机制。"
    },
    {
      id: "course-development",
      name: "发展心理学导论",
      description: "理解个体从婴儿到成年阶段的发展规律与影响因素。"
    },
    {
      id: "course-social",
      name: "社会心理学",
      description: "研究个体如何受到他人、群体与社会情境影响。"
    }
  ],
  concepts: [
    {
      id: "concept-working-memory",
      name: "工作记忆",
      courseIds: ["course-cognitive"],
      description: "处理和暂存当前任务相关信息的有限系统。"
    },
    {
      id: "concept-attention",
      name: "选择性注意",
      courseIds: ["course-cognitive"],
      description: "在众多刺激中优先处理与当前目标相关的信息。"
    },
    {
      id: "concept-schema",
      name: "图式",
      courseIds: ["course-cognitive", "course-social"],
      description: "个体用来组织经验和理解世界的认知框架。"
    },
    {
      id: "concept-attachment",
      name: "依恋类型",
      courseIds: ["course-development", "course-social"],
      description: "儿童与照护者形成的情感联结模式。"
    },
    {
      id: "concept-theory-mind",
      name: "心理理论",
      courseIds: ["course-development", "course-social"],
      description: "理解他人拥有独立信念、愿望与意图的能力。"
    },
    {
      id: "concept-attribution",
      name: "归因偏差",
      courseIds: ["course-social"],
      description: "解释他人行为时常出现的系统性认知偏差。"
    }
  ],
  relations: [
    {
      id: "rel-1",
      source: "concept-attention",
      target: "concept-working-memory",
      label: "影响"
    },
    {
      id: "rel-2",
      source: "concept-schema",
      target: "concept-attribution",
      label: "塑造"
    },
    {
      id: "rel-3",
      source: "concept-attachment",
      target: "concept-theory-mind",
      label: "相关"
    },
    {
      id: "rel-4",
      source: "concept-theory-mind",
      target: "concept-attribution",
      label: "帮助理解"
    }
  ]
};