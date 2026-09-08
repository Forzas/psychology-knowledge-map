const STORAGE_KEY = 'psychology-knowledge-map-data';

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now()}`;

const RELATION_STYLES = {
  cause: { color: '#ff9f7a', label: '因果 / 影响' },
  structure: { color: '#58c4a5', label: '包含 / 组成' },
  contrast: { color: '#5b8def', label: '对比 / 区分' },
  association: { color: '#b19fff', label: '一般关联' }
};

const state = {
  data: loadData(),
  cy: null,
  selectedNodeId: null
};

const els = {
  searchInput: document.getElementById('searchInput'),
  courseFilter: document.getElementById('courseFilter'),
  relationFilter: document.getElementById('relationFilter'),
  showCourseLinks: document.getElementById('showCourseLinks'),
  showConceptLinks: document.getElementById('showConceptLinks'),
  fitGraphBtn: document.getElementById('fitGraphBtn'),
  resetBtn: document.getElementById('resetBtn'),
  courseName: document.getElementById('courseName'),
  addCourseBtn: document.getElementById('addCourseBtn'),
  conceptName: document.getElementById('conceptName'),
  conceptCourse: document.getElementById('conceptCourse'),
  conceptDescription: document.getElementById('conceptDescription'),
  addConceptBtn: document.getElementById('addConceptBtn'),
  relationSource: document.getElementById('relationSource'),
  relationTarget: document.getElementById('relationTarget'),
  relationLabel: document.getElementById('relationLabel'),
  addRelationBtn: document.getElementById('addRelationBtn'),
  markdownInput: document.getElementById('markdownInput'),
  importMarkdownBtn: document.getElementById('importMarkdownBtn'),
  appendMarkdownBtn: document.getElementById('appendMarkdownBtn'),
  dataEditor: document.getElementById('dataEditor'),
  applyJsonBtn: document.getElementById('applyJsonBtn'),
  copyJsonBtn: document.getElementById('copyJsonBtn'),
  downloadJsonBtn: document.getElementById('downloadJsonBtn'),
  uploadJsonInput: document.getElementById('uploadJsonInput'),
  detailsCard: document.getElementById('detailsCard')
};

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return deepClone(window.DEFAULT_DATA);

  try {
    const parsed = JSON.parse(raw);
    validateData(parsed);
    return parsed;
  } catch (error) {
    console.warn('Failed to load saved data, fallback to default', error);
    return deepClone(window.DEFAULT_DATA);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function validateData(data) {
  if (!data || !Array.isArray(data.courses) || !Array.isArray(data.concepts) || !Array.isArray(data.relations)) {
    throw new Error('数据结构无效，必须包含 courses / concepts / relations 三个数组。');
  }
}

function getRelationType(label = '') {
  const text = label.toLowerCase();
  if (/(影响|因果|导致|促进|抑制|受影响|预测|决定|驱动|cause|impact|lead)/.test(text)) return 'cause';
  if (/(包含|组成|属于|层级|子类|上位|下位|part|contain|include)/.test(text)) return 'structure';
  if (/(对比|区分|区别|比较|相反|冲突|contrast|compare|different)/.test(text)) return 'contrast';
  return 'association';
}

function normalizeData(data) {
  return {
    courses: data.courses || [],
    concepts: data.concepts || [],
    relations: (data.relations || []).map((relation) => ({
      ...relation,
      relationType: relation.relationType || getRelationType(relation.label)
    }))
  };
}

function getCourseByName(name) {
  return state.data.courses.find((course) => course.name === name);
}

function getConceptByName(name) {
  return state.data.concepts.find((concept) => concept.name === name);
}

function ensureCourse(name, description = '') {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  let course = getCourseByName(trimmedName);
  if (!course) {
    course = {
      id: `course-${slugify(trimmedName)}`,
      name: trimmedName,
      description: description.trim()
    };
    state.data.courses.push(course);
  } else if (description.trim() && !course.description) {
    course.description = description.trim();
  }

  return course;
}

function ensureConcept(name, description = '', courseIds = []) {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  let concept = getConceptByName(trimmedName);
  if (!concept) {
    concept = {
      id: `concept-${slugify(trimmedName)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmedName,
      courseIds: [...new Set(courseIds)],
      description: description.trim()
    };
    state.data.concepts.push(concept);
  } else {
    concept.courseIds = [...new Set([...(concept.courseIds || []), ...courseIds])];
    if (description.trim() && !concept.description) {
      concept.description = description.trim();
    }
  }

  return concept;
}

function ensureRelation(sourceId, targetId, label = '关联') {
  if (!sourceId || !targetId || sourceId === targetId) return;

  const exists = state.data.relations.some(
    (relation) => relation.source === sourceId && relation.target === targetId && relation.label === label
  );

  if (!exists) {
    state.data.relations.push({
      id: `rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      source: sourceId,
      target: targetId,
      label,
      relationType: getRelationType(label)
    });
  }
}

function buildElements() {
  const selectedCourseId = els.courseFilter.value || 'all';
  const selectedRelationType = els.relationFilter.value || 'all';
  const showCourseLinks = els.showCourseLinks.checked;
  const showConceptLinks = els.showConceptLinks.checked;
  const keyword = (els.searchInput.value || '').trim().toLowerCase();

  const courseMatches = new Set(
    state.data.courses
      .filter((course) => !keyword || `${course.name} ${course.description || ''}`.toLowerCase().includes(keyword))
      .map((course) => course.id)
  );

  const conceptMatches = new Set(
    state.data.concepts
      .filter((concept) => !keyword || `${concept.name} ${concept.description || ''}`.toLowerCase().includes(keyword))
      .map((concept) => concept.id)
  );

  const allowedConceptIds = new Set(
    state.data.concepts
      .filter((concept) => {
        const matchesCourse = selectedCourseId === 'all' || concept.courseIds.includes(selectedCourseId);
        const matchesSearch = !keyword || conceptMatches.has(concept.id) || concept.courseIds.some((courseId) => courseMatches.has(courseId));
        return matchesCourse && matchesSearch;
      })
      .map((concept) => concept.id)
  );

  const allowedCourseIds = new Set(
    state.data.courses
      .filter((course) => {
        const matchesCourse = selectedCourseId === 'all' || course.id === selectedCourseId;
        const hasMatchingConcept = state.data.concepts.some(
          (concept) => concept.courseIds.includes(course.id) && allowedConceptIds.has(concept.id)
        );
        const matchesSearch = !keyword || courseMatches.has(course.id) || hasMatchingConcept;
        return matchesCourse && matchesSearch;
      })
      .map((course) => course.id)
  );

  const courseNodes = state.data.courses
    .filter((course) => allowedCourseIds.has(course.id))
    .map((course) => ({
      data: {
        id: course.id,
        label: course.name,
        type: 'course',
        description: course.description || '',
        matched: keyword ? courseMatches.has(course.id) : false
      }
    }));

  const conceptNodes = state.data.concepts
    .filter((concept) => allowedConceptIds.has(concept.id))
    .map((concept) => ({
      data: {
        id: concept.id,
        label: concept.name,
        type: 'concept',
        description: concept.description || '',
        courseIds: concept.courseIds,
        matched: keyword ? conceptMatches.has(concept.id) : false
      }
    }));

  const courseEdges = showCourseLinks
    ? state.data.concepts
        .filter((concept) => allowedConceptIds.has(concept.id))
        .flatMap((concept) =>
          concept.courseIds
            .filter((courseId) => allowedCourseIds.has(courseId))
            .map((courseId) => ({
              data: {
                id: `edge-course-${courseId}-${concept.id}`,
                source: courseId,
                target: concept.id,
                label: '包含',
                edgeType: 'course-link',
                relationType: 'structure'
              }
            }))
        )
    : [];

  const conceptEdges = showConceptLinks
    ? state.data.relations
        .filter((relation) => {
          const relationType = relation.relationType || getRelationType(relation.label);
          const matchesType = selectedRelationType === 'all' || relationType === selectedRelationType;
          return allowedConceptIds.has(relation.source) && allowedConceptIds.has(relation.target) && matchesType;
        })
        .map((relation) => ({
          data: {
            ...relation,
            relationType: relation.relationType || getRelationType(relation.label),
            edgeType: 'concept-link'
          }
        }))
    : [];

  return [...courseNodes, ...conceptNodes, ...courseEdges, ...conceptEdges];
}

function runLayout() {
  state.cy.layout({
    name: 'cose-bilkent',
    animate: 'end',
    animationDuration: 450,
    nodeRepulsion: 7800,
    idealEdgeLength: 140,
    edgeElasticity: 0.2,
    gravity: 0.1,
    fit: true,
    padding: 40
  }).run();
}

function renderGraph() {
  const elements = buildElements();

  if (!state.cy) {
    cytoscape.use(cytoscapeCoseBilkent);
    state.cy = cytoscape({
      container: document.getElementById('graph'),
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-wrap': 'wrap',
            'text-max-width': 120,
            color: '#2f2248',
            'font-size': 13,
            'text-valign': 'center',
            'text-halign': 'center',
            'border-width': 2,
            'border-color': '#ffffff',
            'text-outline-width': 0
          }
        },
        {
          selector: 'node[type = "course"]',
          style: {
            shape: 'round-rectangle',
            width: 130,
            height: 52,
            'background-color': '#ffb6d9'
          }
        },
        {
          selector: 'node[type = "concept"]',
          style: {
            shape: 'ellipse',
            width: 110,
            height: 110,
            'background-color': '#8fd3ff'
          }
        },
        {
          selector: 'node[matched = true]',
          style: {
            'border-width': 4,
            'border-color': '#ffcf5a'
          }
        },
        {
          selector: 'edge',
          style: {
            width: 2.4,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': 'data(lineColor)',
            'line-color': 'data(lineColor)',
            label: 'data(label)',
            'font-size': 11,
            color: '#6d5a95',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.85,
            'text-background-padding': 3
          }
        },
        {
          selector: 'edge[relationType = "cause"]',
          style: {
            'line-color': RELATION_STYLES.cause.color,
            'target-arrow-color': RELATION_STYLES.cause.color
          }
        },
        {
          selector: 'edge[relationType = "structure"]',
          style: {
            'line-color': RELATION_STYLES.structure.color,
            'target-arrow-color': RELATION_STYLES.structure.color
          }
        },
        {
          selector: 'edge[relationType = "contrast"]',
          style: {
            'line-color': RELATION_STYLES.contrast.color,
            'target-arrow-color': RELATION_STYLES.contrast.color
          }
        },
        {
          selector: 'edge[relationType = "association"]',
          style: {
            'line-color': RELATION_STYLES.association.color,
            'target-arrow-color': RELATION_STYLES.association.color
          }
        },
        {
          selector: 'edge[edgeType = "course-link"]',
          style: {
            'line-style': 'dashed',
            'target-arrow-shape': 'none'
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': 4,
            'border-color': '#7048eb'
          }
        }
      ]
    });

    state.cy.on('tap', 'node', (event) => {
      const node = event.target;
      state.selectedNodeId = node.id();
      renderDetails(node.id());
    });
  } else {
    state.cy.elements().remove();
    state.cy.add(elements);
  }

  runLayout();

  if (state.selectedNodeId && state.cy.getElementById(state.selectedNodeId).length) {
    state.cy.getElementById(state.selectedNodeId).select();
    renderDetails(state.selectedNodeId);
  } else {
    state.selectedNodeId = null;
    els.detailsCard.innerHTML = '点击右侧图谱中的课程或知识点，这里会显示说明、关联课程和相邻概念。';
    els.detailsCard.className = 'empty-state';
  }
}

function renderDetails(nodeId) {
  const course = state.data.courses.find((item) => item.id === nodeId);
  const concept = state.data.concepts.find((item) => item.id === nodeId);

  if (course) {
    const linkedConcepts = state.data.concepts.filter((item) => item.courseIds.includes(course.id));
    els.detailsCard.className = '';
    els.detailsCard.innerHTML = `
      <p class="eyebrow">课程</p>
      <h3>${course.name}</h3>
      <p>${course.description || '暂无课程说明。'}</p>
      <p class="meta">包含 ${linkedConcepts.length} 个知识点</p>
      <div>${linkedConcepts.map((item) => `<span class="detail-pill">${item.name}</span>`).join('')}</div>
    `;
    return;
  }

  if (concept) {
    const courseNames = concept.courseIds
      .map((courseId) => state.data.courses.find((courseItem) => courseItem.id === courseId)?.name)
      .filter(Boolean);

    const neighbors = state.data.relations
      .filter((relation) => relation.source === concept.id || relation.target === concept.id)
      .map((relation) => {
        const otherId = relation.source === concept.id ? relation.target : relation.source;
        const otherConcept = state.data.concepts.find((item) => item.id === otherId);
        const typeLabel = RELATION_STYLES[relation.relationType || getRelationType(relation.label)]?.label || '一般关联';
        return otherConcept ? `${relation.label}（${typeLabel}） · ${otherConcept.name}` : null;
      })
      .filter(Boolean);

    els.detailsCard.className = '';
    els.detailsCard.innerHTML = `
      <p class="eyebrow">知识点</p>
      <h3>${concept.name}</h3>
      <p>${concept.description || '暂无知识点说明。'}</p>
      <p class="meta">出现课程：${courseNames.join(' / ') || '未归属课程'}</p>
      <div>${courseNames.map((item) => `<span class="detail-pill">${item}</span>`).join('')}</div>
      <h4>相邻关系</h4>
      ${neighbors.length ? `<ul>${neighbors.map((item) => `<li>${item}</li>`).join('')}</ul>` : '<p class="meta">暂时还没有关联关系。</p>'}
    `;
  }
}

function populateControls() {
  const courseOptions = ['<option value="all">全部课程</option>']
    .concat(state.data.courses.map((course) => `<option value="${course.id}">${course.name}</option>`))
    .join('');

  const selectedCourse = els.courseFilter.value || 'all';
  els.courseFilter.innerHTML = courseOptions;
  els.courseFilter.value = state.data.courses.some((course) => course.id === selectedCourse) ? selectedCourse : 'all';

  const relationTypes = Array.from(new Set(state.data.relations.map((relation) => relation.relationType || getRelationType(relation.label))));
  const relationOptions = ['<option value="all">全部关系类型</option>']
    .concat(
      relationTypes.map((type) => `<option value="${type}">${RELATION_STYLES[type]?.label || type}</option>`)
    )
    .join('');
  const selectedRelationType = els.relationFilter.value || 'all';
  els.relationFilter.innerHTML = relationOptions;
  els.relationFilter.value = relationTypes.includes(selectedRelationType) ? selectedRelationType : 'all';

  const concreteCourseOptions = state.data.courses
    .map((course) => `<option value="${course.id}">${course.name}</option>`)
    .join('');
  els.conceptCourse.innerHTML = concreteCourseOptions;

  const conceptOptions = state.data.concepts
    .map((concept) => `<option value="${concept.id}">${concept.name}</option>`)
    .join('');
  els.relationSource.innerHTML = conceptOptions;
  els.relationTarget.innerHTML = conceptOptions;

  els.dataEditor.value = JSON.stringify(state.data, null, 2);
}

function syncAndRender() {
  state.data = normalizeData(state.data);
  populateControls();
  saveData();
  renderGraph();
}

function addCourse() {
  const name = els.courseName.value.trim();
  if (!name) return alert('先写一个课程名呀。');

  ensureCourse(name);
  els.courseName.value = '';
  syncAndRender();
}

function addConcept() {
  const name = els.conceptName.value.trim();
  const courseId = els.conceptCourse.value;
  const description = els.conceptDescription.value.trim();
  if (!name || !courseId) return alert('知识点名称和所属课程都要有哦。');

  ensureConcept(name, description, [courseId]);
  els.conceptName.value = '';
  els.conceptDescription.value = '';
  syncAndRender();
}

function addRelation() {
  const source = els.relationSource.value;
  const target = els.relationTarget.value;
  const label = els.relationLabel.value.trim() || '关联';

  if (!source || !target) return alert('先选择两个知识点。');
  if (source === target) return alert('自己连自己会有点晕，换两个点试试。');

  ensureRelation(source, target, label);
  els.relationLabel.value = '';
  syncAndRender();
}

function applyJson() {
  try {
    const parsed = JSON.parse(els.dataEditor.value);
    validateData(parsed);
    state.data = normalizeData(parsed);
    state.selectedNodeId = null;
    syncAndRender();
  } catch (error) {
    alert(`JSON 更新失败：${error.message}`);
  }
}

function copyJson() {
  navigator.clipboard.writeText(els.dataEditor.value).then(() => {
    els.copyJsonBtn.textContent = '已复制';
    setTimeout(() => {
      els.copyJsonBtn.textContent = '复制';
    }, 1200);
  });
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'psychology-knowledge-map.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ''));
      validateData(parsed);
      state.data = normalizeData(parsed);
      state.selectedNodeId = null;
      syncAndRender();
      alert('JSON 文件导入成功啦。');
    } catch (error) {
      alert(`JSON 文件导入失败：${error.message}`);
    } finally {
      els.uploadJsonInput.value = '';
    }
  };
  reader.readAsText(file, 'utf-8');
}

function resetData() {
  state.data = normalizeData(deepClone(window.DEFAULT_DATA));
  state.selectedNodeId = null;
  els.markdownInput.value = '';
  els.searchInput.value = '';
  syncAndRender();
}

function parseMarkdownToData(markdownText) {
  const lines = markdownText.split(/\r?\n/);
  const parsed = {
    courses: [],
    concepts: [],
    relations: []
  };

  let currentCourse = null;
  let currentConcept = null;

  const addCourseLocal = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    let course = parsed.courses.find((item) => item.name === trimmed);
    if (!course) {
      course = { id: `course-${slugify(trimmed)}`, name: trimmed, description: '' };
      parsed.courses.push(course);
    }
    return course;
  };

  const addConceptLocal = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    let concept = parsed.concepts.find((item) => item.name === trimmed);
    if (!concept) {
      concept = {
        id: `concept-${slugify(trimmed)}-${parsed.concepts.length + 1}`,
        name: trimmed,
        courseIds: currentCourse ? [currentCourse.id] : [],
        description: ''
      };
      parsed.concepts.push(concept);
    } else if (currentCourse && !concept.courseIds.includes(currentCourse.id)) {
      concept.courseIds.push(currentCourse.id);
    }
    return concept;
  };

  const addRelationLocal = (sourceName, label, targetName) => {
    const sourceConcept = addConceptLocal(sourceName);
    const targetConcept = addConceptLocal(targetName);
    if (!sourceConcept || !targetConcept || sourceConcept.id === targetConcept.id) return;

    const exists = parsed.relations.some(
      (relation) => relation.source === sourceConcept.id && relation.target === targetConcept.id && relation.label === label
    );
    if (!exists) {
      parsed.relations.push({
        id: `rel-${parsed.relations.length + 1}`,
        source: sourceConcept.id,
        target: targetConcept.id,
        label: label || '关联',
        relationType: getRelationType(label || '关联')
      });
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^#\s*课程[:：]/.test(line)) {
      currentCourse = addCourseLocal(line.replace(/^#\s*课程[:：]/, '').trim());
      currentConcept = null;
      continue;
    }

    if (/^#\s+/.test(line) && !/^#\s*课程[:：]/.test(line)) {
      currentCourse = addCourseLocal(line.replace(/^#\s+/, '').trim());
      currentConcept = null;
      continue;
    }

    if (/^课程说明[:：]/.test(line) && currentCourse) {
      currentCourse.description = line.replace(/^课程说明[:：]/, '').trim();
      continue;
    }

    if (/^##\s*知识点[:：]/.test(line)) {
      currentConcept = addConceptLocal(line.replace(/^##\s*知识点[:：]/, '').trim());
      continue;
    }

    if (/^##\s+/.test(line) && !/^##\s*知识点[:：]/.test(line)) {
      currentConcept = addConceptLocal(line.replace(/^##\s+/, '').trim());
      continue;
    }

    if (/^说明[:：]/.test(line) && currentConcept) {
      currentConcept.description = line.replace(/^说明[:：]/, '').trim();
      continue;
    }

    if (/^关联[:：]/.test(line) && currentConcept) {
      const payload = line.replace(/^关联[:：]/, '').trim();
      const parts = payload.split('|').map((item) => item.trim()).filter(Boolean);
      const targetName = parts[0];
      const label = parts[1] || '关联';
      if (targetName) addRelationLocal(currentConcept.name, label, targetName);
      continue;
    }

    if (/^-\s*/.test(line) && currentConcept && !currentConcept.description) {
      currentConcept.description = line.replace(/^-\s*/, '').trim();
    }
  }

  return parsed;
}

function mergeImportedData(imported) {
  const courseIdMap = new Map();
  const conceptIdMap = new Map();

  for (const course of imported.courses) {
    const ensuredCourse = ensureCourse(course.name, course.description || '');
    if (ensuredCourse) courseIdMap.set(course.id, ensuredCourse.id);
  }

  for (const concept of imported.concepts) {
    const mappedCourseIds = (concept.courseIds || []).map((courseId) => courseIdMap.get(courseId)).filter(Boolean);
    const ensuredConcept = ensureConcept(concept.name, concept.description || '', mappedCourseIds);
    if (ensuredConcept) conceptIdMap.set(concept.id, ensuredConcept.id);
  }

  for (const relation of imported.relations) {
    const sourceId = conceptIdMap.get(relation.source);
    const targetId = conceptIdMap.get(relation.target);
    ensureRelation(sourceId, targetId, relation.label || '关联');
  }
}

function importMarkdown(mode = 'replace') {
  const markdown = els.markdownInput.value.trim();
  if (!markdown) return alert('先贴一点课程笔记嘛。');

  try {
    const imported = parseMarkdownToData(markdown);
    if (!imported.courses.length && !imported.concepts.length) {
      return alert('我没有在这段 Markdown 里识别到课程或知识点，检查一下格式哦。');
    }

    if (mode === 'replace') {
      state.data = { courses: [], concepts: [], relations: [] };
    }

    mergeImportedData(imported);
    state.selectedNodeId = null;
    syncAndRender();
    alert(`导入完成：${imported.courses.length} 门课程，${imported.concepts.length} 个知识点，${imported.relations.length} 条关系。`);
  } catch (error) {
    alert(`Markdown 导入失败：${error.message}`);
  }
}

els.searchInput.addEventListener('input', renderGraph);
els.courseFilter.addEventListener('change', renderGraph);
els.relationFilter.addEventListener('change', renderGraph);
els.showCourseLinks.addEventListener('change', renderGraph);
els.showConceptLinks.addEventListener('change', renderGraph);
els.fitGraphBtn.addEventListener('click', () => runLayout());
els.resetBtn.addEventListener('click', resetData);
els.addCourseBtn.addEventListener('click', addCourse);
els.addConceptBtn.addEventListener('click', addConcept);
els.addRelationBtn.addEventListener('click', addRelation);
els.importMarkdownBtn.addEventListener('click', () => importMarkdown('replace'));
els.appendMarkdownBtn.addEventListener('click', () => importMarkdown('append'));
els.applyJsonBtn.addEventListener('click', applyJson);
els.copyJsonBtn.addEventListener('click', copyJson);
els.downloadJsonBtn.addEventListener('click', downloadJson);
els.uploadJsonInput.addEventListener('change', importJsonFile);

state.data = normalizeData(state.data);
syncAndRender();