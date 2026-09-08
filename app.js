const STORAGE_KEY = 'psychology-knowledge-map-data';

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now()}`;

const state = {
  data: loadData(),
  cy: null,
  selectedNodeId: null
};

const els = {
  courseFilter: document.getElementById('courseFilter'),
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
  dataEditor: document.getElementById('dataEditor'),
  applyJsonBtn: document.getElementById('applyJsonBtn'),
  copyJsonBtn: document.getElementById('copyJsonBtn'),
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

function buildElements() {
  const selectedCourseId = els.courseFilter.value || 'all';
  const showCourseLinks = els.showCourseLinks.checked;
  const showConceptLinks = els.showConceptLinks.checked;

  const allowedConceptIds = new Set(
    state.data.concepts
      .filter((concept) => selectedCourseId === 'all' || concept.courseIds.includes(selectedCourseId))
      .map((concept) => concept.id)
  );

  const allowedCourseIds = new Set(
    state.data.courses
      .filter((course) => selectedCourseId === 'all' || course.id === selectedCourseId)
      .map((course) => course.id)
  );

  const courseNodes = state.data.courses
    .filter((course) => allowedCourseIds.has(course.id))
    .map((course) => ({
      data: {
        id: course.id,
        label: course.name,
        type: 'course',
        description: course.description || ''
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
        courseIds: concept.courseIds
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
                edgeType: 'course-link'
              }
            }))
        )
    : [];

  const conceptEdges = showConceptLinks
    ? state.data.relations
        .filter((relation) => allowedConceptIds.has(relation.source) && allowedConceptIds.has(relation.target))
        .map((relation) => ({
          data: {
            ...relation,
            edgeType: 'concept-link'
          }
        }))
    : [];

  return [...courseNodes, ...conceptNodes, ...courseEdges, ...conceptEdges];
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
          selector: 'edge',
          style: {
            width: 2.4,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#baabff',
            'line-color': '#baabff',
            label: 'data(label)',
            'font-size': 11,
            color: '#6d5a95',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.85,
            'text-background-padding': 3
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
      ],
      layout: {
        name: 'cose-bilkent',
        animate: 'end',
        animationDuration: 450,
        nodeRepulsion: 7800,
        idealEdgeLength: 140,
        edgeElasticity: 0.2,
        gravity: 0.1,
        fit: true,
        padding: 40
      }
    });

    state.cy.on('tap', 'node', (event) => {
      const node = event.target;
      state.selectedNodeId = node.id();
      renderDetails(node.id());
    });
  } else {
    state.cy.elements().remove();
    state.cy.add(elements);
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
        return otherConcept ? `${relation.label} · ${otherConcept.name}` : null;
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
  populateControls();
  saveData();
  renderGraph();
}

function addCourse() {
  const name = els.courseName.value.trim();
  if (!name) return alert('先写一个课程名呀。');

  state.data.courses.push({
    id: `course-${slugify(name)}`,
    name,
    description: ''
  });

  els.courseName.value = '';
  syncAndRender();
}

function addConcept() {
  const name = els.conceptName.value.trim();
  const courseId = els.conceptCourse.value;
  const description = els.conceptDescription.value.trim();
  if (!name || !courseId) return alert('知识点名称和所属课程都要有哦。');

  state.data.concepts.push({
    id: `concept-${slugify(name)}-${Date.now()}`,
    name,
    courseIds: [courseId],
    description
  });

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

  state.data.relations.push({
    id: `rel-${Date.now()}`,
    source,
    target,
    label
  });

  els.relationLabel.value = '';
  syncAndRender();
}

function applyJson() {
  try {
    const parsed = JSON.parse(els.dataEditor.value);
    validateData(parsed);
    state.data = parsed;
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

function resetData() {
  state.data = deepClone(window.DEFAULT_DATA);
  state.selectedNodeId = null;
  syncAndRender();
}

els.courseFilter.addEventListener('change', renderGraph);
els.showCourseLinks.addEventListener('change', renderGraph);
els.showConceptLinks.addEventListener('change', renderGraph);
els.fitGraphBtn.addEventListener('click', () => renderGraph());
els.resetBtn.addEventListener('click', resetData);
els.addCourseBtn.addEventListener('click', addCourse);
els.addConceptBtn.addEventListener('click', addConcept);
els.addRelationBtn.addEventListener('click', addRelation);
els.applyJsonBtn.addEventListener('click', applyJson);
els.copyJsonBtn.addEventListener('click', copyJson);

syncAndRender();