const { ingredients, guaMap, defaultGua } = window.APP_DATA;
const { API_KEY, API_URL, MODEL } = window.APP_CONFIG;

const elementIds = ['bottom-bun', 'lower-fill', 'main-fill', 'mid-fill', 'upper-fill', 'top-bun'];
const ingredientKeys = ['bottomBun', 'lowerFill', 'mainFill', 'midFill', 'upperFill', 'topBun'];
const layerLabels = {
    bottomBun: '第1层',
    lowerFill: '第2层',
    mainFill: '第3层',
    midFill: '第4层',
    upperFill: '第5层',
    topBun: '第6层'
};
const blockedIngredientKeywords = ['饼干', '榨菜', '酸豆角', '梅干菜', '薄荷', '藕片', '豆芽', '海苔', '鱼豆腐', '贝果'];

let selected = createEmptySelection();
const customInputs = {};
let toastTimer = null;
let loadingCycleTimer = null;
let loadingStepTimers = [];

document.addEventListener('DOMContentLoaded', () => {
    sanitizeIngredientCatalog();
    initIngredientButtons();
    bindEvents();
    initStaggerItems();
    switchPage('page-home');
});

function sanitizeIngredientCatalog() {
    ingredientKeys.forEach((key) => {
        const sourceList = Array.isArray(ingredients[key]) ? ingredients[key] : [];
        const unique = new Map();

        sourceList.forEach((item) => {
            const name = (item?.name || '').trim();
            const yy = item?.yy === 'yin' ? 'yin' : 'yang';
            if (!name) {
                return;
            }

            const isBlocked = blockedIngredientKeywords.some((kw) => name.includes(kw));
            if (isBlocked) {
                return;
            }

            if (!unique.has(name)) {
                unique.set(name, { name, yy });
            }
        });

        ingredients[key] = Array.from(unique.values());
    });
}

function createEmptySelection() {
    return {
        bottomBun: null,
        lowerFill: null,
        mainFill: null,
        midFill: null,
        upperFill: null,
        topBun: null
    };
}

function initIngredientButtons() {
    ingredientKeys.forEach((key, idx) => {
        const container = document.getElementById(elementIds[idx]);
        if (!container) {
            return;
        }

        ingredients[key].forEach((item) => {
            const btn = document.createElement('button');
            btn.className = 'burger-btn';
            btn.type = 'button';
            btn.textContent = item.name;
            btn.dataset.name = item.name;
            btn.dataset.yy = item.yy;
            btn.addEventListener('click', () => selectIngredient(key, btn));
            container.appendChild(btn);
        });

        const customBtn = document.createElement('button');
        customBtn.className = 'burger-btn burger-btn-custom';
        customBtn.type = 'button';
        customBtn.textContent = '自定义';
        customBtn.dataset.custom = '1';
        customBtn.addEventListener('click', () => selectIngredient(key, customBtn));
        container.appendChild(customBtn);

        createCustomIngredientInput(key, container);
    });
}

function selectIngredient(type, btn) {
    const siblings = btn.parentElement.querySelectorAll('.burger-btn');
    siblings.forEach((sibling) => sibling.classList.remove('active'));
    btn.classList.add('active');

    const isCustom = btn.dataset.custom === '1';
    if (!isCustom) {
        selected[type] = { name: btn.dataset.name, yy: btn.dataset.yy, isCustom: false };
        toggleCustomInput(type, false);
        return;
    }

    toggleCustomInput(type, true);
    const inputEl = customInputs[type];
    const value = (inputEl?.value || '').trim();
    selected[type] = { name: value, yy: null, isCustom: true };
    if (inputEl) {
        inputEl.focus();
    }
}

function createCustomIngredientInput(type, container) {
    const wrap = document.createElement('div');
    wrap.className = 'hidden custom-input-wrap';
    wrap.dataset.customFor = type;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = '输入自定义配料';
    input.className = 'w-full py-2 px-3 border-2 border-primary/30 rounded-lg bg-white text-sm custom-ingredient-input';
    input.addEventListener('input', () => applyCustomIngredientValue(type, input));
    input.addEventListener('blur', () => applyCustomIngredientValue(type, input));

    wrap.appendChild(input);
    container.insertAdjacentElement('afterend', wrap);
    customInputs[type] = input;
}

function toggleCustomInput(type, visible) {
    const inputEl = customInputs[type];
    if (!inputEl) {
        return;
    }
    const wrap = inputEl.parentElement;
    if (!wrap) {
        return;
    }
    wrap.classList.toggle('hidden', !visible);
    if (!visible) {
        inputEl.classList.remove('input-invalid');
    }
}

function applyCustomIngredientValue(type, inputEl) {
    const value = (inputEl.value || '').trim();
    if (selected[type]?.isCustom) {
        selected[type].name = value;
        selected[type].yy = null;
    }

    if (value) {
        inputEl.classList.remove('input-invalid');
    }
}

function bindEvents() {
    document.getElementById('start-btn').addEventListener('click', () => switchPage('page-build'));
    document.getElementById('reset-btn').addEventListener('click', resetAll);
    document.getElementById('submit-btn').addEventListener('click', generateResult);
    document.getElementById('restart-btn').addEventListener('click', () => {
        switchPage('page-home');
        resetAll();
    });
}

function switchPage(id) {
    document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
    const nextPage = document.getElementById(id);
    nextPage.classList.add('active');
    rerunStaggerAnimation(nextPage);
}

function initStaggerItems() {
    document.querySelectorAll('.page .max-w-md').forEach((container) => {
        Array.from(container.children).forEach((child, idx) => {
            child.classList.add('stagger-item');
            child.style.setProperty('--stagger-index', idx);
        });
    });
}

function rerunStaggerAnimation(pageElement) {
    pageElement.querySelectorAll('.stagger-item').forEach((item) => {
        item.style.animation = 'none';
        void item.offsetHeight;
        item.style.animation = '';
    });
}

function resetAll() {
    document.querySelectorAll('.burger-btn').forEach((btn) => btn.classList.remove('active'));
    document.getElementById('user-question').value = '';
    document.getElementById('user-question').classList.remove('input-invalid');

    ingredientKeys.forEach((key) => {
        const inputEl = customInputs[key];
        if (!inputEl) {
            return;
        }
        inputEl.value = '';
        inputEl.classList.remove('input-invalid');
        toggleCustomInput(key, false);
    });

    selected = createEmptySelection();
}

function showToast(message) {
    const toast = document.getElementById('app-toast');
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add('show');

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}

function yinYangToBit(value) {
    return value === 'yang' ? '1' : '0';
}

function buildYaoCode() {
    return [
        selected.topBun.yy,
        selected.upperFill.yy,
        selected.midFill.yy,
        selected.mainFill.yy,
        selected.lowerFill.yy,
        selected.bottomBun.yy
    ].map(yinYangToBit).join('');
}

function generateGuaSvg(yaoCode) {
    let svg = '<svg viewBox="0 0 100 160" class="w-full h-full">';
    const lineHeight = 10;
    const lineGap = 4;
    const lineStep = lineHeight + lineGap;
    const totalHeight = lineHeight * 6 + lineGap * 5;
    const startY = (160 - totalHeight) / 2;

    for (let row = 0; row < 6; row++) {
        const bit = yaoCode[row];
        const y = startY + row * lineStep;

        if (bit === '1') {
            svg += `<rect class="yao-line" style="--line-delay:${row * 90}ms" x="16" y="${y}" width="68" height="${lineHeight}" rx="2" fill="#FF8C38"/>`;
        } else {
            svg += `<rect class="yao-line" style="--line-delay:${row * 90}ms" x="16" y="${y}" width="29" height="${lineHeight}" rx="2" fill="#FF8C38"/>`;
            svg += `<rect class="yao-line" style="--line-delay:${row * 90 + 40}ms" x="55" y="${y}" width="29" height="${lineHeight}" rx="2" fill="#FF8C38"/>`;
        }
    }

    svg += '</svg>';
    return svg;
}

function ensureLoadingYaoRows() {
    const container = document.getElementById('loading-yao');
    if (!container) {
        return [];
    }

    if (!container.children.length) {
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('div');
            row.className = 'loading-yao-row yin';
            row.innerHTML = '<span></span><span></span>';
            container.appendChild(row);
        }
    }

    return Array.from(container.children);
}

function setLoadingRowType(rowEl, type) {
    rowEl.classList.remove('yang', 'yin', 'show');
    rowEl.classList.add(type);

    if (type === 'yang') {
        rowEl.innerHTML = '<span></span>';
    } else {
        rowEl.innerHTML = '<span></span><span></span>';
    }
}

function clearLoadingAnimationTimers() {
    if (loadingCycleTimer) {
        clearTimeout(loadingCycleTimer);
        loadingCycleTimer = null;
    }

    loadingStepTimers.forEach((timer) => clearTimeout(timer));
    loadingStepTimers = [];
}

function runLoadingYaoCycle() {
    const rows = ensureLoadingYaoRows();
    if (!rows.length) {
        return;
    }

    const randomPattern = Array.from({ length: 6 }, () => (Math.random() < 0.5 ? 'yin' : 'yang'));
    rows.forEach((row, idx) => setLoadingRowType(row, randomPattern[idx]));

    const revealOrder = [5, 4, 3, 2, 1, 0];
    const initialDelay = 50;
    const stepDuration = 95;

    revealOrder.forEach((rowIndex, step) => {
        const timer = setTimeout(() => {
            rows[rowIndex].classList.add('show');
        }, initialDelay + step * stepDuration);
        loadingStepTimers.push(timer);
    });

    const cycleDuration = initialDelay + revealOrder.length * stepDuration + 420;
    loadingCycleTimer = setTimeout(() => {
        runLoadingYaoCycle();
    }, cycleDuration);
}

function startLoadingYaoAnimation() {
    clearLoadingAnimationTimers();
    runLoadingYaoCycle();
}

function stopLoadingYaoAnimation() {
    clearLoadingAnimationTimers();
    const rows = ensureLoadingYaoRows();
    rows.forEach((row) => row.classList.remove('show'));
}

function setResultLoading(isLoading) {
    document.getElementById('loading').classList.toggle('hidden', !isLoading);
    document.getElementById('gua-info').classList.toggle('hidden', isLoading);
    document.getElementById('result-content').classList.toggle('hidden', isLoading);
    document.getElementById('restart-btn').classList.toggle('hidden', isLoading);

    if (isLoading) {
        startLoadingYaoAnimation();
    } else {
        stopLoadingYaoAnimation();
    }
}

function renderGuaInfo(gua, yaoCode) {
    document.getElementById('gua-svg').innerHTML = generateGuaSvg(yaoCode);
    document.getElementById('gua-name').textContent = gua.name;
    document.getElementById('gua-original').textContent = `易经原文：${gua.original}`;
    document.getElementById('gua-meaning').textContent = `卦象释义：${gua.meaning}`;
}

function buildPrompt(gua, userData) {
    const guaDetail = (gua.detail || '').trim() || '暂无详细释义';

    return `
你是「Hamburguar」专属文案生成师，请基于用户汉堡组合生成占卜风格文案。
输入信息：
1. 汉堡配料：顶面包【${userData.topBun}】、上层馅料【${userData.upperFill}】、中层馅料【${userData.midFill}】、核心主馅【${userData.mainFill}】、下层馅料【${userData.lowerFill}】、底面包【${userData.bottomBun}】
2. 用户问题：${userData.question}
3. 对应卦象：${gua.name}，核心卦义：${gua.meaning}
4. 卦象细节参考：${guaDetail}

写作规则：
1. 严格遵循叙事顺序：拿起汉堡→入口层次→核心爆发→收束建议。
2. 只输出一整段，不分点不换段。
3. 结尾必须回应用户问题，给出可执行建议。
4. 全文约 200-250 字，语气温暖、具体、克制。
5. 禁止出现“阴阳、爻、卦辞”等专业术语。
`;
}

function buildLocalResult(gua, userData) {
    const questionText = userData.question === '无具体问题' ? '此刻你心里那件还未说出口的事' : userData.question;
    return `你捧起这只汉堡，先感到${userData.bottomBun}带来的稳定，再被${userData.lowerFill}与${userData.midFill}慢慢托住节奏，咬到${userData.mainFill}时情绪被点亮，最后由${userData.upperFill}和${userData.topBun}收成余味。这个组合对应「${gua.name}」，提示你面对「${questionText}」时，先稳住可控部分，再推进关键一步。真正让局面变好的，不是突然的好运，而是你把每一层都放在了合适的位置。`;
}

async function callAI(gua, userData) {
    if (!API_KEY) {
        return buildLocalResult(gua, userData);
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: buildPrompt(gua, userData) }],
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('API 返回内容为空');
    }

    return content;
}

function normalizeIngredientName(name) {
    return String(name || '').trim().toLowerCase();
}

function buildCustomYYPrompt(uniqueItems) {
    const payload = uniqueItems.map((item) => ({
        id: item.id,
        ingredient: item.name
    }));

    return [
        '你是食材阴阳分类助手。请根据食材属性、烹饪方式与体感倾向判断阴(yin)/阳(yang)。',
        '只输出 JSON，不要输出其他文字。',
        '输出格式：{"items":[{"id":"i1","yy":"yin"}]}',
        '要求：yy 只能是 "yin" 或 "yang"。',
        `输入数据：${JSON.stringify(payload)}`
    ].join('\n');
}

function extractJsonObject(text) {
    if (!text) {
        return null;
    }

    const trimmed = text.trim();
    try {
        return JSON.parse(trimmed);
    } catch (error) {
        // Continue.
    }

    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
        try {
            return JSON.parse(fencedMatch[1].trim());
        } catch (error) {
            // Continue.
        }
    }

    const blockMatch = trimmed.match(/\{[\s\S]*\}/);
    if (blockMatch?.[0]) {
        try {
            return JSON.parse(blockMatch[0]);
        } catch (error) {
            return null;
        }
    }

    return null;
}

async function classifyCustomIngredients(uniqueItems) {
    if (!uniqueItems.length) {
        return {};
    }
    if (!API_KEY) {
        throw new Error('missing_api_key_for_custom_classification');
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: buildCustomYYPrompt(uniqueItems) }],
            temperature: 0,
            max_tokens: 240
        })
    });

    if (!response.ok) {
        throw new Error(`custom_classification_failed_${response.status}`);
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    const parsed = extractJsonObject(content);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const mapped = {};

    items.forEach((item) => {
        const key = item?.id;
        const yy = item?.yy === 'yin' ? 'yin' : item?.yy === 'yang' ? 'yang' : null;
        if (key && yy) {
            mapped[key] = yy;
        }
    });

    return mapped;
}

async function resolveCustomSelectionYY() {
    const customItems = ingredientKeys
        .filter((key) => selected[key]?.isCustom)
        .map((key) => ({ key, name: (selected[key].name || '').trim() }));

    if (!customItems.length) {
        return;
    }

    const missing = customItems.find((item) => !item.name);
    if (missing) {
        const inputEl = customInputs[missing.key];
        if (inputEl) {
            inputEl.classList.add('input-invalid');
            inputEl.focus();
        }
        throw new Error(`missing_custom_name_${missing.key}`);
    }

    const uniqueMap = new Map();
    customItems.forEach((item) => {
        const normalizedName = normalizeIngredientName(item.name);
        if (!uniqueMap.has(normalizedName)) {
            uniqueMap.set(normalizedName, {
                id: `i${uniqueMap.size + 1}`,
                name: item.name,
                normalizedName
            });
        }
    });

    const uniqueItems = Array.from(uniqueMap.values());
    const yyByUniqueId = await classifyCustomIngredients(uniqueItems);
    const yyByName = {};
    uniqueItems.forEach((item) => {
        if (yyByUniqueId[item.id]) {
            yyByName[item.normalizedName] = yyByUniqueId[item.id];
        }
    });

    const unresolved = customItems.filter((item) => !yyByName[normalizeIngredientName(item.name)]);
    if (unresolved.length) {
        throw new Error('custom_classification_unresolved');
    }

    customItems.forEach((item) => {
        selected[item.key].yy = yyByName[normalizeIngredientName(item.name)];
    });
}

async function generateResult() {
    const questionInput = document.getElementById('user-question');
    const questionText = questionInput.value.trim();
    const hasEmpty = Object.values(selected).some((value) => !value);
    if (hasEmpty) {
        showToast('请先完成 6 层汉堡食材搭配');
        return;
    }

    if (!questionText) {
        showToast('请输入你想占卜的问题');
        questionInput.classList.add('input-invalid');
        questionInput.focus();
        return;
    }

    questionInput.classList.remove('input-invalid');

    switchPage('page-result');
    setResultLoading(true);

    try {
        await resolveCustomSelectionYY();
    } catch (error) {
        const msg = String(error?.message || '');
        const layerKey = msg.startsWith('missing_custom_name_') ? msg.replace('missing_custom_name_', '') : '';

        if (layerLabels[layerKey]) {
            showToast(`${layerLabels[layerKey]}的自定义配料还未填写`);
        } else if (msg === 'missing_api_key_for_custom_classification') {
            showToast('自定义配料需要 AI 判阴阳，请先配置 API Key');
        } else {
            showToast('自定义配料阴阳判定失败，请稍后重试');
        }

        setResultLoading(false);
        switchPage('page-build');
        console.error('自定义配料判定失败:', error);
        return;
    }

    const userData = {
        topBun: selected.topBun.name,
        upperFill: selected.upperFill.name,
        midFill: selected.midFill.name,
        mainFill: selected.mainFill.name,
        lowerFill: selected.lowerFill.name,
        bottomBun: selected.bottomBun.name,
        question: questionText
    };

    const yaoCode = buildYaoCode();
    const gua = guaMap[yaoCode] || defaultGua;

    renderGuaInfo(gua, yaoCode);

    try {
        const content = await callAI(gua, userData);
        document.getElementById('result-content').textContent = content;
    } catch (error) {
        document.getElementById('result-content').textContent = `${buildLocalResult(gua, userData)}\n\n提示：在线占卜文案暂时不可用，已为你生成本地结果。`;
        console.error('调用 AI 失败:', error);
    } finally {
        setResultLoading(false);
    }
}
