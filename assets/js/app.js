const { ingredients, guaMap, defaultGua } = window.APP_DATA;
const { API_KEY, API_URL, MODEL } = window.APP_CONFIG;

const elementIds = ['bottom-bun', 'lower-fill', 'main-fill', 'mid-fill', 'upper-fill', 'top-bun'];
const ingredientKeys = ['bottomBun', 'lowerFill', 'mainFill', 'midFill', 'upperFill', 'topBun'];
const blockedIngredientKeywords = ['饼干', '榨菜', '酸豆角', '梅干菜', '薄荷', '藕片', '豆芽', '海苔', '鱼豆腐', '贝锅'];

let selected = createEmptySelection();
let toastTimer = null;

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
        ingredients[key].forEach((item) => {
            const btn = document.createElement('button');
            btn.className = 'burger-btn';
            btn.textContent = item.name;
            btn.dataset.name = item.name;
            btn.dataset.yy = item.yy;
            btn.addEventListener('click', () => selectIngredient(key, btn));
            container.appendChild(btn);
        });
    });
}

function selectIngredient(type, btn) {
    const siblings = btn.parentElement.querySelectorAll('.burger-btn');
    siblings.forEach((sibling) => sibling.classList.remove('active'));
    btn.classList.add('active');
    selected[type] = { name: btn.dataset.name, yy: btn.dataset.yy };
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
    // 标准六码顺序：上爻到初爻（顶面包到底面包）。
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

    // 码值已是“上爻到初爻”，可直接从上到下绘制。
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

function setResultLoading(isLoading) {
    document.getElementById('loading').classList.toggle('hidden', !isLoading);
    document.getElementById('gua-info').classList.toggle('hidden', isLoading);
    document.getElementById('result-content').classList.toggle('hidden', isLoading);
    document.getElementById('restart-btn').classList.toggle('hidden', isLoading);
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
你是「Hamburguar」专属文案生成师，生成沉浸式美食占卜文案。
输入信息：
1. 汉堡配料：顶面包【${userData.topBun}】、上层馅料【${userData.upperFill}】、中层馅料【${userData.midFill}】、核心主馅【${userData.mainFill}】、下层馅料【${userData.lowerFill}】、底面包【${userData.bottomBun}】
2. 用户问题：${userData.question}
3. 对应卦象：${gua.name}，核心卦义：${gua.meaning}
4. 卦象细节参考：${guaDetail}

写作规则：
1. 严格流程：捧起汉堡→第一口基底→中层展开→核心爆发→上层点缀→收尾→心绪→领悟
2. 自然描写食材口感，心绪层层递进
3. 结尾紧扣卦义+回应用户问题，用汉堡隐喻
4. 全文不分段，180-280字，温柔治愈
5. 严禁阴阳、爻、卦辞等玄学术语，纯娱乐
    `;
}

function buildLocalResult(gua, userData) {
    const questionText = userData.question === '无具体问题' ? '此刻你心里那件还未说出口的事' : userData.question;
    return `你捧起这只汉堡，先感到${userData.bottomBun}的扎实，再被${userData.lowerFill}和${userData.midFill}慢慢托住节奏，咬到${userData.mainFill}时情绪像被点亮，最后由${userData.upperFill}与${userData.topBun}收成温柔余味。这个组合对应「${gua.name}」，提示你在面对“${questionText}”时，不必急着给出最硬的答案，先稳住当下可控的部分，再把关键一步做准。你会发现，真正让局面变好的，不是突然的好运，而是每一层都放在了合适的位置。`;
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

    switchPage('page-result');
    setResultLoading(true);
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
