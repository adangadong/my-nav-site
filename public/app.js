// 初始化本地状态
let state = {
  groups: [],
  isAdmin: false,
  adminPassword: '',
  privatePassword: '' // 用于存放私密目录的明文密码
};

// 页面加载完成后立即执行
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  autoLoginAndLoad(); // 自动免密登录、自动检测私密解锁，并加载数据
});

// 从 Cloudflare 后端获取网址数据
async function loadData() {
  // 将私密密码带入请求中
  const url = `/api/get-links?private_pwd=${encodeURIComponent(state.privatePassword)}`; //[cite: 17]
  try {
    const res = await fetch(url);
    const data = await res.json();
    state.groups = data.groups || []; //[cite: 17]
    renderDOM(); //[cite: 17]
  } catch (err) {
    console.error("加载数据失败:", err); //[cite: 17]
  }
}

// 自动检测本地密码并加载数据
async function autoLoginAndLoad() {
  // 1. 检测本地是否存在 30 天内有效的“查看私密”会话
  const privateSessionStr = localStorage.getItem("private_session");
  if (privateSessionStr) {
    try {
      const session = JSON.parse(privateSessionStr);
      const now = new Date().getTime();
      if (now < session.expiry && session.password) {
        // 先把密码记录到 state，等会儿 loadData 时会自动带上
        state.privatePassword = session.password;
        
        // 更新界面上“查看私密”按钮为“锁住私密”
        const privateBtn = document.getElementById('private-btn');
        if (privateBtn) {
          privateBtn.innerText = "锁住私密";
          privateBtn.onclick = () => lockPrivate();
        }
      } else {
        localStorage.removeItem("private_session");
      }
    } catch (e) {
      localStorage.removeItem("private_session");
    }
  }

  // 2. 检测本地是否存在管理员登录状态
  const sessionStr = localStorage.getItem("admin_session"); //[cite: 17]
  if (sessionStr) { //[cite: 17]
    try { //[cite: 17]
      const session = JSON.parse(sessionStr); //[cite: 17]
      const now = new Date().getTime(); //[cite: 17]
      
      if (now < session.expiry && session.password) { //[cite: 17]
        // 尝试静默向后台验证密码
        const res = await fetch('/api/auth', { //[cite: 17]
          method: 'POST', //[cite: 17]
          body: JSON.stringify({ password: session.password, type: 'admin' }) //[cite: 17]
        });
        const result = await res.json(); //[cite: 17]

        if (result.success) { //[cite: 17]
          state.isAdmin = true; //[cite: 17]
          state.adminPassword = session.password; //[cite: 17]
          
          const adminBtn = document.getElementById('admin-btn'); //[cite: 17]
          if (adminBtn) { //[cite: 17]
            adminBtn.innerText = "退出管理"; //[cite: 17]
            adminBtn.onclick = () => logoutAdmin(); //[cite: 17]
          }
          const addGroupBtn = document.getElementById('add-group-btn'); //[cite: 17]
          if (addGroupBtn) { //[cite: 17]
            addGroupBtn.classList.remove('hidden'); //[cite: 17]
          }
        } else {
          localStorage.removeItem("admin_session"); //[cite: 17]
        }
      } else {
        localStorage.removeItem("admin_session"); //[cite: 17]
      }
    } catch (e) {
      localStorage.removeItem("admin_session"); //[cite: 17]
    }
  }
  
  // 3. 无论自动登录/解锁成功与否，最后都去加载网址数据
  await loadData(); //[cite: 17]
}

// 统一的退出管理函数
window.logoutAdmin = function() {
  localStorage.removeItem("admin_session"); //[cite: 17]
  location.reload(); //[cite: 17]
};

// 【新增】验证并解锁私密目录
window.verifyPrivate = async function() {
  const pwd = prompt("请输入查看私密目录的密码：");
  if (!pwd) return;

  // 向后台验证私密密码
  const res = await fetch('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ password: pwd, type: 'private' }) // 验证类型为 private
  });
  const result = await res.json();

  if (result.success) {
    state.privatePassword = pwd;
    
    // 写入 localStorage，设置 30 天后过期免密
    const privateLoginData = {
      password: pwd,
      expiry: new Date().getTime() + 30 * 24 * 60 * 60 * 1000 // 30天
    };
    localStorage.setItem("private_session", JSON.stringify(privateLoginData));

    // 切换按钮状态
    const privateBtn = document.getElementById('private-btn');
    if (privateBtn) {
      privateBtn.innerText = "锁住私密";
      privateBtn.onclick = () => lockPrivate();
    }

    // 重新加载数据（会带上新验证通过的密码，从而获取到隐藏分组）
    await loadData();
    alert("私密空间已成功解锁！");
  } else {
    alert("密码错误，无法解锁！");
  }
};

// 【新增】锁住私密目录（清除状态）
window.lockPrivate = function() {
  localStorage.removeItem("private_session");
  state.privatePassword = '';
  const privateBtn = document.getElementById('private-btn');
  if (privateBtn) {
    privateBtn.innerText = "查看私密";
    privateBtn.onclick = () => verifyPrivate();
  }
  // 重新加载页面或数据，此时隐藏的分组将再次消失
  location.reload();
};

// 初始化护眼模式
function initTheme() {
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) { //[cite: 17]
    document.documentElement.classList.add('dark'); //[cite: 17]
  } else {
    document.documentElement.classList.remove('dark'); //[cite: 17]
  }
}

// 动态将数据渲染到 HTML 页面中
function renderDOM() {
  const container = document.getElementById('nav-container'); //[cite: 17]
  if (!container) return; //[cite: 17]
  container.innerHTML = ''; //[cite: 17]

  state.groups.forEach((group, groupIdx) => { //[cite: 17]
    // 创建分组/文件夹卡片
    const groupCard = document.createElement('div'); //[cite: 17]
    groupCard.className = 'p-6 bg-white dark:bg-gray-800 rounded-2xl card-shadow border border-gray-100/50 dark:border-gray-700/50 transition-all duration-300'; //[cite: 17]
    
    // 分组头部（标题、折叠状态）
    const isCollapsed = group.isCollapsed ? 'max-height: 0px; opacity: 0; overflow: hidden;' : 'max-height: 1000px; opacity: 1;'; //[cite: 17]
    const arrowRotation = group.isCollapsed ? '' : 'transform: rotate(90deg);'; //[cite: 17]

    groupCard.innerHTML = `
      <div class="flex justify-between items-center cursor-pointer mb-2" onclick="toggleFolder(${groupIdx})">
        <div class="flex items-center space-x-2">
          <span class="transform transition-transform duration-200 text-gray-400" style="${arrowRotation}">▶</span>
          <h3 class="font-bold text-lg tracking-wide text-gray-800 dark:text-gray-200">${group.name}</h3>
          ${group.isPrivate ? '<span class="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">加密</span>' : ''}
        </div>
        ${state.isAdmin ? `<button onclick="event.stopPropagation(); deleteGroup(${groupIdx})" class="text-xs text-red-400 hover:text-red-600">删除组</button>` : ''}
      </div>
      
      <!-- 网址列表区域（支持折叠） -->
      <div class="folder-content overflow-hidden transition-all duration-300" style="${isCollapsed}">
        <ul class="space-y-2 mt-4">
          ${group.links.map((link, linkIdx) => `
            <li class="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group/item transition-colors">
              <a href="${link.url}" target="_blank" class="flex items-center space-x-3 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 font-medium w-full">
                <img src="https://www.google.com/s2/favicons?domain=${link.url}&sz=32" class="w-4 h-4 rounded-sm" onerror="this.src='data:image/svg+xml;utf8,<svg...'"/>
                <span>${link.title}</span>
              </a>
              ${state.isAdmin ? `
                <div class="flex space-x-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <button onclick="event.stopPropagation(); editLink(${groupIdx}, ${linkIdx})" class="text-xs text-blue-500">改</button>
                  <button onclick="event.stopPropagation(); deleteLink(${groupIdx}, ${linkIdx})" class="text-xs text-red-500">删</button>
                </div>
              ` : ''}
            </li>
          `).join('')}
        </ul>
        ${state.isAdmin ? `<button onclick="event.stopPropagation(); addLink(${groupIdx})" class="w-full mt-3 py-1.5 border border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-400 hover:text-blue-500 transition-colors">+ 添加网址</button>` : ''}
      </div>
    `; //[cite: 17]
    container.appendChild(groupCard); //[cite: 17]
  });
}

// 文件夹折叠切换
window.toggleFolder = function(idx) {
  state.groups[idx].isCollapsed = !state.groups[idx].isCollapsed; //[cite: 17]
  renderDOM(); //[cite: 17]
};

// ================= 管理员与数据修改功能 =================
window.verifyAdmin = async function() {
  const pwd = prompt("请输入管理员密码："); //[cite: 17]
  if (!pwd) return; //[cite: 17]

  const res = await fetch('/api/auth', { //[cite: 17]
    method: 'POST', //[cite: 17]
    body: JSON.stringify({ password: pwd, type: 'admin' }) //[cite: 17]
  });
  const result = await res.json(); //[cite: 17]

  if (result.success) { //[cite: 17]
    state.isAdmin = true; //[cite: 17]
    state.adminPassword = pwd; //[cite: 17]
    
    const loginData = { //[cite: 17]
      password: pwd, //[cite: 17]
      expiry: new Date().getTime() + 30 * 24 * 60 * 60 * 1000 // 30天 //[cite: 17]
    };
    localStorage.setItem("admin_session", JSON.stringify(loginData)); //[cite: 17]

    document.getElementById('admin-btn').innerText = "退出管理"; //[cite: 17]
    document.getElementById('admin-btn').onclick = () => logoutAdmin(); //[cite: 17]
    document.getElementById('add-group-btn').classList.remove('hidden'); //[cite: 17]
    renderDOM(); //[cite: 17]
  } else {
    alert("密码错误！"); //[cite: 17]
  }
};

window.addGroup = function() {
  const name = prompt("输入新分组名称："); //[cite: 17]
  if (!name) return; //[cite: 17]
  const isPrivate = confirm("是否将此分组设为隐藏私密目录？"); //[cite: 17]
  state.groups.push({ name, isPrivate, isCollapsed: false, links: [] }); //[cite: 17]
  saveToServer(); //[cite: 17]
};

window.addLink = function(groupIdx) {
  const title = prompt("网站名称："); //[cite: 17]
  const url = prompt("网址 (例如 https://example.com)："); //[cite: 17]
  if (!title || !url) return; //[cite: 17]
  state.groups[groupIdx].links.push({ title, url }); //[cite: 17]
  saveToServer(); //[cite: 17]
};

window.editLink = function(groupIdx, linkIdx) {
  const link = state.groups[groupIdx].links[linkIdx]; //[cite: 17]
  const title = prompt("修改网站名称：", link.title); //[cite: 17]
  const url = prompt("修改网址：", link.url); //[cite: 17]
  if (!title || !url) return; //[cite: 17]
  state.groups[groupIdx].links[linkIdx] = { title, url }; //[cite: 17]
  saveToServer(); //[cite: 17]
};

window.deleteLink = function(groupIdx, linkIdx) {
  if(confirm("确定删除？")) { //[cite: 17]
    state.groups[groupIdx].links.splice(linkIdx, 1); //[cite: 17]
    saveToServer(); //[cite: 17]
  }
};

window.deleteGroup = function(groupIdx) {
  if(confirm("确定删除整个分组及其下的所有网址吗？")) { //[cite: 17]
    state.groups.splice(groupIdx, 1); //[cite: 17]
    saveToServer(); //[cite: 17]
  }
};

async function saveToServer() {
  if (!state.isAdmin) { //[cite: 17]
    alert("保存失败：当前不是管理员状态！"); //[cite: 17]
    return; //[cite: 17]
  }
  
  renderDOM(); //[cite: 17]
  
  try {
    console.log("准备发送数据到后端...", state.groups); //[cite: 17]
    const res = await fetch('/api/save-links', { //[cite: 17]
      method: 'POST', //[cite: 17]
      headers: { //[cite: 17]
        'Content-Type': 'application/json' //[cite: 17]
      },
      body: JSON.stringify({ 
        password: state.adminPassword, //[cite: 17]
        data: { groups: state.groups } //[cite: 17]
      })
    });
    
    if (!res.ok) { //[cite: 17]
      const errText = await res.text(); //[cite: 17]
      alert(`【保存失败】服务器响应异常！\n状态码: ${res.status}\n响应内容: ${errText.substring(0, 100)}`); //[cite: 17]
      return; //[cite: 17]
    }

    const result = await res.json(); //[cite: 17]
    if (!result.success) { //[cite: 17]
      alert("【同步失败】后端返回错误：" + (result.message || result.error || "未知原因")); //[cite: 17]
    } else {
      console.log("数据同步成功！", state.groups); //[cite: 17]
    }
  } catch (e) {
    alert("【网络致命错误】无法连接到保存接口，请检查后台路由设置！\n错误详情: " + e.message); //[cite: 17]
  }
}
