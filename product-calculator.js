// 全局设置
let settings = {
    interestRate: 1.286, // 默认费率
    downPaymentRatios: [0.2, 0.3, 0.35, 0.4, 0.45, 0.5], // 首付比例选项
    leasePeriods: [6, 10, 12], // 租期选项
    costIntervals: {},     // 成本区间配置
    rateTable: {},         // 费率配置表 (首付比例 × 租期)
    serviceCost: {}        // 服务成本配置
};

// 初始化服务成本区间 (1000-9000元，每350元一个区间)
const serviceCostIntervals = [];
for (let i = 1000; i <= 9000; i += 350) {
    serviceCostIntervals.push(i);
}

// 根据用户提供的配置设置服务成本
settings.serviceCost = {
    1000: 320,
    1350: 290,
    1700: 270,
    2050: 230,
    2400: 250,
    2750: 160,
    3100: 180,
    3450: 170,
    3800: 163,
    4150: 150,
    4500: 170,
    4850: 150,
    5200: 158,
    5550: 130,
    5900: 6,
    6250: 120,
    6600: 150,
    6950: 140,
    7300: 37,
    7650: 150,
    8000: 180,
    8350: 210,
    8700: 236
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    bindEvents();
    generateRateTable();
    // 初始化服务成本表格
    initializeServiceCostTable();
    updateUI();
});

// 绑定事件
function bindEvents() {
    // 计算按钮点击事件
    document.getElementById('calculateBtn').addEventListener('click', calculate);
    
    // 管理面板相关事件
    document.getElementById('closeAdminPanel').addEventListener('click', closeAdminPanel);
    document.getElementById('addRatioBtn').addEventListener('click', addDownPaymentRatio);
    document.getElementById('addPeriodBtn').addEventListener('click', addLeasePeriod);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    // 添加导出设置按钮事件
    if (document.getElementById('exportSettingsBtn')) {
        document.getElementById('exportSettingsBtn').addEventListener('click', exportSettings);
    }
    
    // 检查管理访问 - 放在验证之前，确保优先执行
    document.getElementById('productPrice').addEventListener('input', checkManagementAccess);
    
    // 回车键检查管理访问
    document.getElementById('productPrice').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value === '今天开心888') {
            checkManagementAccess(this);
        }
    });
    
    // 输入验证
    document.getElementById('productPrice').addEventListener('input', validatePrice);
    
    // 首付比例变化时更新租期选项
    document.getElementById('downPaymentRatio').addEventListener('change', updateLeasePeriodOptions);
}

// 验证商品售价
function validatePrice() {
    const priceInput = document.getElementById('productPrice');
    const priceError = document.getElementById('priceError');
    const calculateBtn = document.getElementById('calculateBtn');
    const inputValue = priceInput.value;
    
    // 如果输入的是管理密码，不进行验证
    if (inputValue === '今天开心888') {
        calculateBtn.disabled = false;
        calculateBtn.classList.remove('disabled');
        return true;
    }
    
    const price = parseFloat(inputValue);
    
    if (isNaN(price) || price <= 0) {
        priceError.textContent = '请输入有效的商品售价';
        calculateBtn.disabled = true;
        calculateBtn.classList.add('disabled');
        return false;
    } else if (price < 2000) {
        priceError.textContent = '售价不能低于2000元';
        calculateBtn.disabled = true;
        calculateBtn.classList.add('disabled');
        return false;
    } else if (price > 1000000) {
        priceError.textContent = '售价不能超过100万元';
        calculateBtn.disabled = true;
        calculateBtn.classList.add('disabled');
        return false;
    } else {
        priceError.textContent = '';
        calculateBtn.disabled = false;
        calculateBtn.classList.remove('disabled');
        return true;
    }
}

// 计算函数
function calculate() {
    // 验证输入
    if (!validatePrice()) {
        return;
    }
    
    // 获取输入值
    const productPrice = parseFloat(document.getElementById('productPrice').value);
    const downPaymentRatio = parseFloat(document.getElementById('downPaymentRatio').value);
    const leasePeriod = parseInt(document.getElementById('leasePeriod').value);
    
    // 计算首付金额
    const downPayment = productPrice * downPaymentRatio;
    
    // 计算未付金额
    const unpaidAmount = productPrice - downPayment;
    
    // 获取适用的费率
    const effectiveRate = getEffectiveRate(downPaymentRatio, leasePeriod);
    
    // 正确的计算逻辑：商品剩余金额 * (费率 / 100) = 待付租金金额
    const rentAmount = unpaidAmount * (effectiveRate / 100);
    
    // 计算服务成本（基于商品售价）
    const serviceCost = calculateServiceCost(productPrice);
    
    // 首付金额 + 待付租金金额 + 服务成本金额 = 总租金（包含首付）
    const totalAmountToPay = downPayment + rentAmount + serviceCost;
    
    // 计算月供（总租金 - 首付 / 剩余期数，不包括首付）
    const monthlyPayment = (totalAmountToPay - downPayment) / (leasePeriod - 1);
    
    // 更新结果显示
    updateResults({
        downPayment: downPayment,
        rentAmount: rentAmount,
        serviceCost: serviceCost,
        totalAmountToPay: totalAmountToPay,
        monthlyPayment: monthlyPayment,
        leasePeriod: leasePeriod
    });
}

// 计算服务成本
function calculateServiceCost(amount) {
    // 找到对应的金额区间
    let interval = 1000;
    // 定义服务成本区间（与HTML表格中的区间一致）
    const ranges = [1000, 1350, 1700, 2050, 2400, 2750, 3100, 3450, 3800, 4150, 4500, 4850, 5200, 5550, 5900, 6250, 6600, 6950, 7300, 7650, 8000, 8350, 8700];
    
    for (let i = 0; i < ranges.length; i++) {
        const currentRange = ranges[i];
        const nextRange = i < ranges.length - 1 ? ranges[i + 1] : Infinity;
        
        if (amount >= currentRange && amount < nextRange) {
            interval = currentRange;
            break;
        }
    }
    
    // 如果金额超过最大区间，使用最大区间
    if (amount >= ranges[ranges.length - 1]) {
        interval = ranges[ranges.length - 1];
    }
    
    // 返回配置的服务成本，如果没有配置则返回0
    return settings.serviceCost[interval] || 0;
}

// 获取有效的费率
function getEffectiveRate(ratio, period) {
    // 如果有配置的费率表，使用配置的费率
    if (settings.rateTable[ratio] && settings.rateTable[ratio][period]) {
        // 返回显示给用户的费率值（实际存储值 + 100）
        return parseFloat(settings.rateTable[ratio][period]) + 100;
    }
    // 否则使用默认费率（同样需要加100，保持一致性）
    return settings.interestRate + 100;
}

// 更新结果显示
function updateResults(results) {
    // 隐藏费用总览
    const overviewSection = document.querySelector('.overview-section');
    overviewSection.classList.add('hidden');
    
    // 显示账单详情
    const billSection = document.querySelector('.bill-section');
    billSection.classList.remove('hidden');
    
    // 更新首付
    document.getElementById('downPayment').textContent = formatCurrency(results.downPayment);
    
    // 更新待付租金金额（但不显示）
    document.getElementById('rentAmount').textContent = formatCurrency(results.rentAmount);
    
    // 更新服务成本金额（但不显示）
    document.getElementById('serviceCost').textContent = formatCurrency(results.serviceCost);
    
    // 更新剩余期数应付金额（但不显示）
    document.getElementById('totalAmountToPayDetail').textContent = formatCurrency(results.totalAmountToPay);
    
    // 生成分期列表
    generateInstallmentList(results.monthlyPayment, results.leasePeriod, results.downPayment);
}

// 生成分期列表
function generateInstallmentList(monthlyPayment, period, downPayment) {
    const container = document.getElementById('installmentList');
    container.innerHTML = '';
    
    // 显示第2期到第period期的月供，不显示重复的首付
    for (let i = 2; i <= period; i++) {
        const installmentItem = document.createElement('div');
        installmentItem.className = 'bill-item';
        installmentItem.innerHTML = `
            <span class="bill-label">第${i}期</span>
            <span class="bill-value currency">${formatCurrency(monthlyPayment)}</span>
        `;
        container.appendChild(installmentItem);
    }
}

// 格式化货币
function formatCurrency(amount) {
    return `¥${amount.toFixed(2)}元`;
}

// 检查是否输入管理密码
function checkManagementAccess(event) {
    // 兼容两种调用方式：事件对象或直接传入DOM元素
    const inputElement = event.target || event;
    if (inputElement.value === '今天开心888') {
        // 清除错误信息
        document.getElementById('priceError').textContent = '';
        // 打开管理面板
        openAdminPanel();
        // 清空输入框
        inputElement.value = '';
    }
}

// 打开管理面板
function openAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    adminPanel.style.display = 'block';
    generateRateTable();
    // 确保服务成本表格已初始化
    initializeServiceCostTable();
}

// 关闭管理面板
function closeAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    adminPanel.style.display = 'none';
}

// 更新UI
function updateUI() {
    // 更新首付比例选项
    updateDownPaymentRatioOptions();
    
    // 更新租期选项
    updateLeasePeriodOptions();
    
    // 更新服务成本表格
    if (document.getElementById('adminPanel').style.display !== 'none') {
        initializeServiceCostTable();
    }
}

// 更新首付比例选项
function updateDownPaymentRatioOptions() {
    const select = document.getElementById('downPaymentRatio');
    select.innerHTML = '';
    
    settings.downPaymentRatios.forEach(ratio => {
        const option = document.createElement('option');
        option.value = ratio;
        option.textContent = `首付${(ratio * 100).toFixed(0)}％`;
        // 默认选中30%首付比例
        if (ratio === 0.3) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // 同时更新管理面板中的首付比例列表
    updateRatioListInAdmin();
}

// 更新租期选项
function updateLeasePeriodOptions() {
    const select = document.getElementById('leasePeriod');
    select.innerHTML = '';
    
    // 添加默认的"--请选择--"选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '--请选择--';
    defaultOption.selected = true;
    defaultOption.disabled = true;
    select.appendChild(defaultOption);
    
    // 获取当前选择的首付比例，如果获取不到则使用默认值0.3
    const currentRatio = parseFloat(document.getElementById('downPaymentRatio').value) || 0.3;
    
    // 根据首付比例决定是否显示12期选项
    settings.leasePeriods.forEach(period => {
        // 只有当首付比例大于等于35%时，才显示12期选项
        if (currentRatio >= 0.35 || period !== 12) {
            const option = document.createElement('option');
            option.value = period;
            option.textContent = `${period}期`;
            select.appendChild(option);
        }
    });
    
    // 同时更新管理面板中的租期列表
    updatePeriodListInAdmin();
}

// 更新管理面板中的首付比例列表
function updateRatioListInAdmin() {
    const container = document.getElementById('ratioList');
    container.innerHTML = '';
    
    settings.downPaymentRatios.forEach((ratio, index) => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        listItem.innerHTML = `
            <input type="number" step="0.01" value="${ratio}" data-index="${index}" onchange="updateRatio(${index}, this.value)">
            <button class="remove-btn" onclick="removeDownPaymentRatio(${index})">&times;</button>
        `;
        container.appendChild(listItem);
    });
}

// 更新管理面板中的租期列表
function updatePeriodListInAdmin() {
    const container = document.getElementById('periodList');
    container.innerHTML = '';
    
    settings.leasePeriods.forEach((period, index) => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        listItem.innerHTML = `
            <input type="number" step="1" min="1" value="${period}" data-index="${index}" onchange="updatePeriod(${index}, this.value)">
            <button class="remove-btn" onclick="removeLeasePeriod(${index})">&times;</button>
        `;
        container.appendChild(listItem);
    });
}

// 生成费率配置表
function generateRateTable() {
    const container = document.getElementById('rateTable');
    
    // 创建表格
    let html = '<table class="rate-table">';
    
    // 创建表头
    html += '<tr><th></th>';
    settings.leasePeriods.forEach(period => {
        html += `<th>${period}期</th>`;
    });
    html += '</tr>';
    
    // 创建表格内容
    settings.downPaymentRatios.forEach(ratio => {
        html += `<tr><td>首付${(ratio * 100).toFixed(0)}%</td>`;
        
        settings.leasePeriods.forEach(period => {
            // 明确检查费率是否存在且为数字类型，确保默认费率正确应用
            const rate = settings.rateTable[ratio] && typeof settings.rateTable[ratio][period] === 'number' ? 
                        settings.rateTable[ratio][period] : settings.interestRate;
            // 显示时将数值加上100，解决显示不正确的问题
            const displayRate = parseFloat(rate) + 100;
            
            // 根据数值大小调整显示的小数位数，保持与之前显示格式一致
            const fixedRate = displayRate % 1 === 0 ? displayRate.toFixed(0) : displayRate.toFixed(1);
            
            html += `<td><input type="number" step="0.01" value="${fixedRate}" 
                   onchange="updateRateTable(${ratio}, ${period}, (this.value - 100))"></td>`;
        });
        
        html += '</tr>';
    });
    
    html += '</table>';
    container.innerHTML = html;
}

// 初始化服务成本表格事件监听器
function initializeServiceCostTable() {
    console.log('initializeServiceCostTable 函数被调用');
    
    // 检查 settings.serviceCost 是否存在，如不存在则初始化
    if (!settings.serviceCost) {
        console.log('初始化 settings.serviceCost');
        settings.serviceCost = {};
    }
    
    // 定义服务成本区间（与HTML表格中的区间一致）
    const ranges = [1000, 1350, 1700, 2050, 2400, 2750, 3100, 3450, 3800, 4150, 4500, 4850, 5200, 5550, 5900, 6250, 6600, 6950, 7300, 7650, 8000, 8350, 8700];
    
    // 为每个输入框添加事件监听器
    ranges.forEach(min => {
        const input = document.getElementById(`cost${min}`);
        if (input) {
            // 设置默认值（如果settings中没有的话）
            if (!settings.serviceCost[min]) {
                settings.serviceCost[min] = parseFloat(input.value) || 0;
            }
            
            // 从settings加载保存的值
            input.value = settings.serviceCost[min];
            
            // 添加事件监听器，当值改变时更新设置
            input.addEventListener('change', () => {
                settings.serviceCost[min] = parseFloat(input.value) || 0;
                saveSettings();
            });
        }
    });
    
    console.log('服务成本表格初始化完成');
}

// 更新服务成本
function updateServiceCost(interval, cost) {
    settings.serviceCost[interval] = parseFloat(cost);
}

// 添加首付比例
function addDownPaymentRatio() {
    settings.downPaymentRatios.push(0.5); // 默认添加50%首付
    updateDownPaymentRatioOptions();
    generateRateTable();
}

// 添加租期
function addLeasePeriod() {
    settings.leasePeriods.push(30); // 默认添加30期
    updateLeasePeriodOptions();
    generateRateTable();
}

// 移除首付比例
function removeDownPaymentRatio(index) {
    if (settings.downPaymentRatios.length > 1) {
        settings.downPaymentRatios.splice(index, 1);
        updateDownPaymentRatioOptions();
        generateRateTable();
    } else {
        alert('至少需要保留一个首付比例选项');
    }
}

// 移除租期
function removeLeasePeriod(index) {
    if (settings.leasePeriods.length > 1) {
        settings.leasePeriods.splice(index, 1);
        updateLeasePeriodOptions();
        generateRateTable();
    } else {
        alert('至少需要保留一个租期选项');
    }
}

// 更新首付比例
function updateRatio(index, value) {
    settings.downPaymentRatios[index] = parseFloat(value);
    updateDownPaymentRatioOptions();
    generateRateTable();
}

// 更新租期
function updatePeriod(index, value) {
    settings.leasePeriods[index] = parseInt(value);
    updateLeasePeriodOptions();
    generateRateTable();
}

// 更新费率表
function updateRateTable(ratio, period, rate) {
    if (!settings.rateTable[ratio]) {
        settings.rateTable[ratio] = {};
    }
    settings.rateTable[ratio][period] = parseFloat(rate);
}

// 保存设置
function saveSettings() {
    // 保存到本地存储
    localStorage.setItem('calculatorSettings', JSON.stringify(settings));
    // 移除弹窗提示，避免频繁打扰用户
    // alert('设置已保存！');
    // 不再自动关闭管理面板，让用户可以继续修改
    // closeAdminPanel();
}

// 导出设置到代码文件
function exportSettings() {
    // 生成代码字符串
    const settingsCode = `// 管理面板设置的配置
let settings = ${JSON.stringify(settings, null, 2)};

// 初始化服务成本区间
settings.serviceCost = ${JSON.stringify(settings.serviceCost, null, 2)};
`;
    
    // 创建下载链接
    const blob = new Blob([settingsCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calculator-settings.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 显示导出成功提示
    const exportMessage = document.getElementById('exportMessage');
    if (exportMessage) {
        exportMessage.textContent = '设置已导出！请将文件内容复制到product-calculator.js中。';
        exportMessage.style.display = 'block';
        
        // 3秒后隐藏提示
        setTimeout(() => {
            exportMessage.style.display = 'none';
        }, 3000);
    }
    
    // 同时显示在控制台，方便复制
    console.log('=== 导出的设置代码 ===');
    console.log(settingsCode);
    console.log('====================');
    console.log('请将以上代码复制到 product-calculator.js 文件的开头部分，替换原有的默认设置。');
}

// 加载设置
function loadSettings() {
    console.log('加载设置...');
    const saved = localStorage.getItem('calculatorSettings');
    if (saved) {
        console.log('找到保存的设置');
        settings = JSON.parse(saved);
        
        // 确保serviceCost属性存在
        if (!settings.serviceCost) {
            console.error('保存的设置中没有serviceCost，重新初始化');
            settings.serviceCost = {};
        }
        
        console.log('加载的serviceCost:', settings.serviceCost);
        
        // 定义服务成本区间（与HTML表格中的区间一致）
        const intervals = [1000, 1350, 1700, 2050, 2400, 2750, 3100, 3450, 3800, 4150, 4500, 4850, 5200, 5550, 5900, 6250, 6600, 6950, 7300, 7650, 8000, 8350, 8700];
        
        // 确保所有区间都有值
        intervals.forEach(min => {
            if (settings.serviceCost[min] === undefined) {
                // 从HTML中获取默认值
                const input = document.getElementById(`cost${min}`);
                if (input) {
                    settings.serviceCost[min] = parseFloat(input.value) || 0;
                } else {
                    settings.serviceCost[min] = Math.round(min * 0.01);
                }
                console.log('为区间 ' + min + ' 添加默认成本: ' + settings.serviceCost[min]);
            }
        });
    } else {
        console.log('没有找到保存的设置，初始化默认设置');
        // 初始化默认费率表
        initializeDefaultRateTable();
    }
}

// 初始化默认费率表
function initializeDefaultRateTable() {
    console.log('初始化默认费率表...');
    
    // 确保rateTable存在
    settings.rateTable = {};
    
    // 根据用户提供的费率配置表设置费率（首付比例 × 租期）
    // 注意：存储的是实际费率，显示时会加上100
    const rateData = {
        0.2: { 6: 34.8, 10: 42.6, 12: 17 },
        0.3: { 6: 32.5, 10: 37.3, 12: 47.3 },
        0.35: { 6: 31.8, 10: 37.3, 12: 46.8 },
        0.4: { 6: 31.1, 10: 36.8, 12: 45.7 },
        0.45: { 6: 29.3, 10: 36, 12: 45.6 },
        0.5: { 6: 27.2, 10: 32.9, 12: 44.8 }
    };
    
    // 应用费率数据
    Object.keys(rateData).forEach(ratio => {
        const ratioNum = parseFloat(ratio);
        settings.rateTable[ratioNum] = {};
        
        Object.keys(rateData[ratio]).forEach(period => {
            const periodNum = parseInt(period);
            settings.rateTable[ratioNum][periodNum] = rateData[ratio][period];
        });
    });
    
    // 服务成本已在settings对象初始化时设置，不需要强制重新初始化
    // 如果serviceCost不存在，则初始化它
    if (!settings.serviceCost) {
        settings.serviceCost = {};
        
        // 定义服务成本区间（与HTML表格中的区间一致）
        const intervals = [1000, 1350, 1700, 2050, 2400, 2750, 3100, 3450, 3800, 4150, 4500, 4850, 5200, 5550, 5900, 6250, 6600, 6950, 7300, 7650, 8000, 8350, 8700];
        
        // 为每个区间设置默认值
        intervals.forEach(min => {
            settings.serviceCost[min] = Math.round(min * 0.01);
            console.log('区间 ' + min + ' 的默认成本: ' + settings.serviceCost[min]);
        });
    }
}

// 重置设置
function resetSettings() {
    if (confirm('确定要重置所有设置吗？')) {
        settings = {
            interestRate: 1.286,
            downPaymentRatios: [0.2, 0.3, 0.35, 0.4, 0.45, 0.5],
            leasePeriods: [6, 10, 12],
            costIntervals: {},
            rateTable: {},
            serviceCost: {}
        };
        
        initializeDefaultRateTable();
        localStorage.removeItem('calculatorSettings');
        updateUI();
        
        // 重新初始化服务成本表格
        initializeServiceCostTable();
        
        alert('设置已重置！');
    }
}