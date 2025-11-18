// API密钥验证
document.getElementById('verify-key-btn').addEventListener('click', function() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    
    if (apiKey) {
        // 简单验证API密钥格式
        if (apiKey.length >= 32) {
            localStorage.setItem('modelscope_api_key', apiKey);
            document.getElementById('api-key-container').style.display = 'none';
            document.getElementById('main-container').style.display = 'block';
        } else {
            showNotification('错误', '请输入有效的API密钥', 'error');
        }
    } else {
        showNotification('提示', '请输入API密钥');
    }
});

// 退出登录
document.getElementById('logout-btn').addEventListener('click', function() {
    localStorage.removeItem('modelscope_api_key');
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('api-key-container').style.display = 'flex';
    document.getElementById('api-key-input').value = '';
});

// 页面加载时检查API密钥
window.addEventListener('load', function() {
    const savedApiKey = localStorage.getItem('modelscope_api_key');
    if (savedApiKey) {
        document.getElementById('api-key-container').style.display = 'none';
        document.getElementById('main-container').style.display = 'block';
    }
});

// API调用函数
async function callModelScopeAPI(prompt, systemPrompt = '') {
    const apiKey = localStorage.getItem('modelscope_api_key');
    if (!apiKey) {
        showNotification('提示', '请先设置API密钥');
        return;
    }

    try {
        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2048,
                temperature: 0.7,
                enable_thinking: false
            })
        });

        if (!response.ok) {
            let errorMessage = `HTTP错误! 状态码: ${response.status}`;
            
            // 处理不同的错误状态码
            if (response.status === 401) {
                errorMessage += '\nAPI密钥无效或已过期，请重新输入有效的密钥。';
                localStorage.removeItem('modelscope_api_key');
                document.getElementById('main-container').style.display = 'none';
                document.getElementById('api-key-container').style.display = 'flex';
            } else if (response.status === 429) {
                errorMessage += '\n请求过于频繁，请稍后再试。';
            } else if (response.status === 500) {
                errorMessage += '\n服务器内部错误，请稍后再试。';
            } else if (response.status === 403) {
                errorMessage += '\n没有权限访问该资源，请检查API密钥权限。';
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('API调用失败:', error);
        showNotification('生成失败', error.message, 'error');
        return null;
    }
}

// PBL任务生成
document.getElementById('generate-pbl-btn').addEventListener('click', async function() {
    const topic = document.getElementById('pbl-topic').value.trim();
    const grade = document.getElementById('pbl-grade').value;
    const generateBtn = this;
    const generateIcon = document.getElementById('generate-icon');
    const originalText = generateBtn.innerHTML;
    
    if (!topic) {
        showNotification('提示', '请输入任务主题');
        return;
    }

    // 显示加载状态
    generateBtn.disabled = true;
    generateIcon.className = 'spin';
    document.getElementById('pbl-result-content').innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <h4>正在生成PBL任务</h4>
            <p>AI正在为您创建适合乡村学生的探究性学习任务，请稍候...</p>
        </div>
    `;

    try {
        // 随机选择任务标题前缀
        const titlePrefixes = ['探索', '发现', '解密', '调查', '研究', '制作', '设计', '创造', '观察', '体验'];
        const randomPrefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
        
        // 构建提示词
        const prompt = `为${grade}的乡村儿童创建一个以"${topic}"为主题的PBL（项目式学习）任务。任务标题要有趣新颖，可以使用"${randomPrefix}${topic}"作为开头。任务内容要结合乡村实际生活场景，简单易行，所需材料容易获取。任务应包括：
1. 有趣的任务介绍（吸引学生兴趣）
2. 明确的学习目标
3. 详细的步骤指导
4. 可能用到的材料清单
5. 成果展示建议
6. 评估标准`;
        
        // 系统角色定义
        const systemPrompt = `你是一位经验丰富的乡村教育专家，擅长设计适合乡村儿童的项目式学习任务。请确保任务：
1. 符合乡村实际情况，考虑到资源有限的条件
2. 结合当地自然环境和生活场景
3. 简单易行，安全性高
4. 能够激发学生的好奇心和探索精神
5. 适合指定年龄段学生的认知水平
6. 语言通俗易懂，避免复杂术语
7. 提供具体、可操作的指导`;

        const result = await callModelScopeAPI(prompt, systemPrompt);
        
        if (result) {
        // 格式化并显示结果
        document.getElementById('pbl-result-content').innerHTML = formatPBLResult(result);
    } else {
        document.getElementById('pbl-result-content').innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h4>生成失败</h4>
                <p>任务生成遇到问题，请稍后重试或尝试更换任务主题</p>
            </div>
        `;
    }
    } catch (error) {
        console.error('生成失败:', error);
        document.getElementById('pbl-result-content').innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h4>生成失败</h4>
                <p>任务生成遇到问题，请稍后重试</p>
            </div>
        `;
    } finally {
        // 恢复按钮状态
        generateBtn.disabled = false;
        generateIcon.className = '';
        generateBtn.innerHTML = originalText;
    }
});

// 格式化PBL结果为更美观的UI
function formatPBLResult(text) {
    // 处理标题 - 添加更精美的样式
    text = text.replace(/^# (.*?)$/gm, '<h3 class="pbl-result-title">$1</h3>');
    
    // 处理二级标题 - 使用CSS类而非内联样式
    text = text.replace(/^## (.*?)$/gm, '<h4 class="section-subheading">$1</h4>');
    
    // 处理三级标题
    text = text.replace(/^### (.*?)$/gm, '<h5 style="color: var(--text-secondary); margin-top: 20px; margin-bottom: 10px;">$1</h5>');
    
    // 处理强调文本
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 处理代码
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // 处理引用
    text = text.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
    
    // 处理段落
    text = text.replace(/^(?!<h|<ul|<ol|<li|<blockquote|<p)(.*?)$/gm, function(match) {
        if (match.trim()) {
            return `<p>${match}</p>`;
        }
        return match;
    });
    
    // 处理无序列表
    text = formatListItems(text, /\n\* (.*?)(?=\n\*|$)/gs, 'ul');
    
    // 处理有序列表
    text = formatNumberedList(text);
    
    // 添加任务卡片包装器
    text = `<div class="task-content-wrapper">${text}</div>`;
    
    return text;
}

// 格式化列表项
function formatListItems(text, regex, tag) {
    let match;
    while ((match = regex.exec(text)) !== null) {
        const items = match[0].split(`\n* `).filter(item => item.trim());
        let listHtml = `<${tag}>`;
        items.forEach(item => {
            listHtml += `<li>${item}</li>`;
        });
        listHtml += `</${tag}>`;
        text = text.replace(match[0], listHtml);
    }
    return text;
}

// 格式化有序列表
function formatNumberedList(text) {
    const lines = text.split('\n');
    let result = '';
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
        
        if (numberedMatch) {
            if (!inList) {
                result += '<ol>';
                inList = true;
            }
            result += `<li>${numberedMatch[2]}</li>`;
        } else {
            if (inList) {
                result += '</ol>';
                inList = false;
            }
            result += line + '\n';
        }
    }
    
    if (inList) {
        result += '</ol>';
    }
    
    return result;
}

// 显示通知框函数
function showNotification(title, content, type = 'info') {
    const notification = document.getElementById('result-notification');
    const notificationTitle = document.getElementById('notification-title');
    const notificationContent = document.getElementById('notification-content');
    
    // 设置内容
    notificationTitle.textContent = title;
    
    // 格式化内容为HTML
    const formattedContent = content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    notificationContent.innerHTML = `<p>${formattedContent}</p>`;
    
    // 根据类型设置样式
    notification.className = `result-notification ${type}`;
    
    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 移除自动关闭功能，通知将保持显示直到用户手动关闭
}

// 分享任务功能
function shareTask() {
    const taskContent = document.getElementById('pbl-result-content').innerText;
    if (navigator.share) {
        navigator.share({
            title: '乡村儿童学习助手 - PBL任务',
            text: taskContent.substring(0, 200) + '...'
        }).catch(err => {
            console.error('分享失败:', err);
        });
    } else {
        // 复制到剪贴板
        navigator.clipboard.writeText(taskContent).then(() => {
            showNotification('成功', '任务内容已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    }
}

// 学习资源推荐
document.getElementById('recommend-resource-btn').addEventListener('click', async function() {
    const topic = document.getElementById('resource-topic').value.trim();
    if (!topic) {
        showNotification('提示', '请输入学生兴趣方向');
        return;
    }

    const btn = this;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = '推荐中...';

    try {
        const prompt = `为乡村儿童推荐3-5个与"${topic}"相关的优质学习资源。请包括：
1. 适合乡村环境的实践活动
2. 可以利用现有材料完成的项目
3. 与当地生活相关的学习内容
4. 每个资源请提供简短介绍和适合的年龄段
5. 相关的入门书籍`;

        const systemPrompt = `你是一位专业的教育资源推荐专家，熟悉乡村教育环境。请推荐的资源必须：
1. 考虑乡村地区资源有限的情况
2. 结合当地自然环境和生活场景
3. 简单易行，所需材料容易获取
4. 能够激发学生的学习兴趣
5. 提供具体、实用的内容
6. 避免推荐需要昂贵设备或网络条件要求高的资源`;

        const result = await callModelScopeAPI(prompt, systemPrompt);
        
        if (result) {
            // 显示推荐结果（这里可以扩展为更美观的UI）
            showNotification('学习资源推荐', result);
        }
    } catch (error) {
        console.error('推荐失败:', error);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
});

// 学习问题解答
document.getElementById('answer-question-btn').addEventListener('click', async function() {
    const question = document.getElementById('question-input').value.trim();
    if (!question) {
        showNotification('提示', '请输入学习问题');
        return;
    }

    const btn = this;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = '解答中...';

    try {
        const prompt = `请简单易懂地解答以下学习问题，并尽量结合乡村生活实际举例说明：\n\n${question}`;

        const systemPrompt = `你是一位耐心的乡村教育辅导老师，擅长用简单易懂的语言解释各种知识，并结合乡村生活实际进行举例。请确保：
1. 解答简单明了，避免使用复杂术语
2. 结合乡村生活中的常见场景和例子
3. 语言生动有趣，适合儿童理解
4. 尽量使用具体、形象的描述
5. 如有必要，可以提供简单的实践建议`;

        const result = await callModelScopeAPI(prompt, systemPrompt);
        
        if (result) {
            showNotification('问题解答', result);
        }
    } catch (error) {
        console.error('解答失败:', error);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
});

// 教师助手
document.getElementById('teacher-help-btn').addEventListener('click', async function() {
    const need = document.getElementById('teacher-need').value;
    const topic = document.getElementById('teacher-topic').value.trim();
    if (!topic) {
        showNotification('提示', '请输入具体主题');
        return;
    }

    const btn = this;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = '生成中...';

    try {
        let prompt = '';
        let systemPrompt = '你是一位经验丰富的乡村教育专家，熟悉乡村教学环境和资源条件。';

        // 根据不同需求生成不同的提示词
        switch (need) {
            case '教案设计':
                prompt = `请为乡村学校设计一份关于"${topic}"的详细教案，考虑乡村教学条件有限的情况，确保教学内容适合当地学生。教案应包括：教学目标、教学重难点、教学准备、教学过程、作业设计和教学反思等部分。`;
                systemPrompt += ' 请设计的教案必须符合乡村实际教学条件，内容生动有趣，能够充分利用当地资源。';
                break;
            case '教具制作':
                prompt = `请提供几种关于"${topic}"的简易教具制作方法，要求材料容易获取（尽量使用乡村常见材料），制作步骤简单，实用有效。每个教具请说明所需材料、制作步骤、使用方法和教学价值。`;
                systemPrompt += ' 请推荐的教具必须考虑乡村资源有限的情况，利用常见材料制作，且具有实用性和教学价值。';
                break;
            case '作业设计':
                prompt = `请为"${topic}"设计一套适合乡村学生的作业，包括基础题、应用题和实践题。作业要结合乡村生活实际，能够培养学生的动手能力和创新思维，难度适中，题量合理。`;
                systemPrompt += ' 请设计的作业必须联系乡村实际生活，形式多样，能够激发学生兴趣，培养综合能力。';
                break;
            case '课堂管理':
                prompt = `请提供一些适合乡村学校的课堂管理技巧和方法，特别是针对"${topic}"教学中的常见问题。包括：维持课堂纪律的方法、激发学生参与度的策略、处理特殊情况的技巧等。`;
                systemPrompt += ' 请提供的课堂管理方法必须切实可行，适合乡村学生特点，尊重当地文化习俗，注重学生的全面发展。';
                break;
        }

        const result = await callModelScopeAPI(prompt, systemPrompt);
        
        if (result) {
            showNotification(`${need}结果`, result);
        }
    } catch (error) {
        console.error('生成失败:', error);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
});

// 任务卡片点击事件
const taskCards = document.querySelectorAll('.task-card');
taskCards.forEach(card => {
    card.addEventListener('click', function() {
        const taskTitle = this.querySelector('.task-title').textContent;
        document.getElementById('pbl-topic').value = taskTitle;
        // 滚动到PBL生成区域
        document.getElementById('pbl-section').scrollIntoView({ behavior: 'smooth' });
    });
});

// 学习资源卡片点击事件
const resourceCards = document.querySelectorAll('.resource-card');
resourceCards.forEach((card, index) => {
    card.addEventListener('click', function() {
        const title = this.querySelector('.resource-title').textContent;
        const description = this.querySelector('.resource-description').textContent;
        
        // 根据不同资源类型提供具体内容
        let detailedContent = '';
        
        switch(index) {
            case 0: // 自然科学探索手册
                detailedContent = `
                    <h4>📚 适合不同阶段的自然科学读物推荐</h4>
                    <p><strong>低年级（1-3年级）：</strong>《身边的科学》、《小小科学家》系列，通过简单有趣的实验和观察活动，引导孩子发现自然界的奥秘。</p>
                    <p><strong>中年级（4-6年级）：</strong>《科学探索之旅》、《万物运转的秘密》，帮助学生理解基本的科学原理，培养科学思维。</p>
                    <p><strong>高年级（7-9年级）：</strong>《科学百科全书》、《青少年科学实验大全》，深入学习科学知识，为更高层次的学习打下基础。</p>
                    
                    <h4>🔬 实践活动建议</h4>
                    <p><strong>观察类活动：</strong>观察植物生长过程、记录天气变化、观察昆虫生活习性等。</p>
                    <p><strong>实验类活动：</strong>制作简易显微镜观察细胞、制作火山模型模拟喷发、制作简易电路等。</p>
                    <p><strong>调研类活动：</strong>调查当地水资源状况、研究土壤成分、观察动物迁徙等。</p>
                    
                    <h4>📋 学习目标</h4>
                    <ul>
                        <li>培养学生对自然科学的兴趣和好奇心</li>
                        <li>掌握基本的科学观察和实验方法</li>
                        <li>理解科学与日常生活的联系</li>
                        <li>发展科学思维和解决问题的能力</li>
                    </ul>
                `;
                break;
            case 1: // 乡土文化故事集
                detailedContent = `
                    <h4>📖 乡土文化读物推荐</h4>
                    <p><strong>民间故事类：</strong>《中国民间故事》、《各地传说故事集》，收录了各地的民间传说和神话故事。</p>
                    <p><strong>地方文化类：</strong>《家乡风俗志》、《地方文化探秘》，详细介绍各地的风俗习惯、传统节日和文化特色。</p>
                    <p><strong>历史传承类：</strong>《家族史话》、《村落记忆》，记录家族和村落的历史变迁。</p>
                    
                    <h4>🎭 实践活动建议</h4>
                    <p><strong>调研活动：</strong>采访村中长者，收集家族和村落的历史故事；记录当地的风俗习惯和传统技艺。</p>
                    <p><strong>创作活动：</strong>编写家乡故事、绘制家乡地图、制作传统手工艺品。</p>
                    <p><strong>展示活动：</strong>举办故事会、文化展览、传统技艺展示等。</p>
                    
                    <h4>📋 学习目标</h4>
                    <ul>
                        <li>增强对家乡文化的认同感和自豪感</li>
                        <li>了解和传承优秀的乡土文化</li>
                        <li>提高语言表达和写作能力</li>
                        <li>培养文化保护意识和社会责任感</li>
                    </ul>
                `;
                break;
            case 2: // 数学趣味应用
                detailedContent = `
                    <h4>🔢 生活中的数学实际问题读物推荐</h4>
                    <p><strong>基础应用类：</strong>《生活中的数学》、《数学真有趣》系列，通过生活实例讲解数学概念。</p>
                    <p><strong>农业应用类：</strong>《农业中的数学》、《农村经济数学》，专门介绍数学在农业生产和农村经济中的应用。</p>
                    <p><strong>实践探索类：</strong>《数学实践活动手册》、《身边的数学问题》，引导学生发现和解决生活中的数学问题。</p>
                    
                    <h4>📊 实践活动建议</h4>
                    <p><strong>测量类活动：</strong>测量土地面积、计算农作物产量、统计家庭收支等。</p>
                    <p><strong>规划类活动：</strong>设计家庭菜园布局、规划出行路线、安排活动时间等。</p>
                    <p><strong>分析类活动：</strong>分析市场价格变化、统计学习成绩、评估投资收益等。</p>
                    
                    <h4>📋 学习目标</h4>
                    <ul>
                        <li>理解数学在生活中的实际应用价值</li>
                        <li>掌握基本的数学运算和分析方法</li>
                        <li>提高解决实际问题的能力</li>
                        <li>培养数学思维和逻辑推理能力</li>
                    </ul>
                `;
                break;
            default:
                detailedContent = `
                    <p>${description}</p>
                    <p>这是一个详细的学习资源介绍。在这里，您可以找到与该主题相关的更多内容，包括学习目标、所需材料、步骤指导等详细信息。</p>
                    <p>您可以根据这些指导来开展相关的学习活动，或者将其作为教学参考。</p>
                `;
        }
        
        // 设置模态窗口内容
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = `
            <p>${description}</p>
            ${detailedContent}
            <p>💡 <strong>温馨提示：</strong>您可以根据这些指导来开展相关的学习活动，或者将其作为教学参考。建议结合实际情况调整内容，以更好地适应学生的学习需求。</p>
        `;
        
        // 显示模态窗口
        document.getElementById('resource-modal').style.display = 'block';
    });
});

// 关闭模态窗口
const closeModal = document.getElementById('close-modal');
closeModal.addEventListener('click', function() {
    document.getElementById('resource-modal').style.display = 'none';
});

// 点击模态窗口外部关闭
window.addEventListener('click', function(event) {
    const modal = document.getElementById('resource-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});