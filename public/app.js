// 初始化本地状态
let state = {
  groups: [],
  isAdmin: false,
  adminPassword: '',
  privatePassword: ''
};

// 页面加载完成后立即执行
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initTheme();
});

// 从 Cloudflare 后端获取网址数据
async function loadData() {
  const url = `/api/get-links?private_pwd=${encodeURIComponent(state.privatePassword)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    state.groups = data.groups || [];
    renderDOM();
  } catch (err) {
    console.error("加载数据失败:", err);
  }
}

// 初始化护眼模式
function initTheme() {
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// 动态将数据渲染到 HTML 页面中
function renderDOM() {
  const container = document.getElementById('nav-container');
  if (!container) return;
  container.innerHTML = '';

  state.groups.forEach((group, groupIdx) => {
    // 创建分组/文件夹卡片
    const groupCard = document.createElement('div');
    groupCard.className = 'p-6 bg-white dark:bg-gray-800 rounded-2xl card-shadow border border-gray-100/50 dark:border-gray-700/50 transition-all duration-300';
    
    // 分组头部（标题、折叠状态）
    const isCollapsed = group.isCollapsed ? 'max-height: 0px; opacity: 0; overflow: hidden;' : 'max-height: 1000px; opacity: 1;';
    const arrowRotation = group.isCollapsed ? '' : 'transform: rotate(90deg);';

    groupCard.innerHTML = `
      <div class="flex justify-between items-center cursor-pointer mb-2" onclick="toggleFolder(${groupIdx})">
        <div class="flex items-center space-x-2">
          <span class="transform transition-transform duration-200 text-gray-400" style="${arrowRotation}">▶</span>
          <h3 class="font-bold text-lg tracking-wide text-gray-800 dark:text-gray-200">${group.name}</h3>
          ${group.isLocked ? '<span class="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">加密</span>' : ''}
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
                  <button onclick="editLink(${groupIdx}, ${linkIdx})" class="text-xs text-blue-500">改</button>
                  <button onclick="deleteLink(${groupIdx}, ${linkIdx})" class="text-xs text-red-500">删</button>
                </div>
              ` : ''}
            </li>
          `).join('')}
        </ul>
        ${state.isAdmin ? `<button onclick="addLink(${groupIdx})" class="w-full mt-3 py-1.5 border border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-400 hover:text-blue-500 transition-colors">+ 添加网址</button>` : ''}
      </div>
    `;
    container.appendChild(groupCard);
  });
}

// 文件夹折叠切换
window.toggleFolder = function(idx) {
  state.groups[idx].isCollapsed = !state.groups[idx].isCollapsed;
  renderDOM();
};

// ================= 管理员与数据修改功能 =================
window.verifyAdmin = async function() {
  const pwd = prompt("请输入管理员密码：");
  if (!pwd) return;

  const res = await fetch('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ password: pwd, type: 'admin' })
  });
  const result = await res.json();

  if (result.success) {
    state.isAdmin = true;
    state.adminPassword = pwd;
    document.getElementById('admin-btn').innerText = "退出管理";
    document.getElementById('admin-btn').onclick = () => location.reload();
    document.getElementById('add-group-btn').classList.remove('hidden');
    renderDOM();
  } else {
    alert("密码错误！");
  }
};

window.addGroup = function() {
  const name = prompt("输入新分组名称：");
  if (!name) return;
  const isPrivate = confirm("是否将此分组设为隐藏私密目录？");
  state.groups.push({ name, isPrivate, isCollapsed: false, links: [] });
  saveToServer();
};

window.addLink = function(groupIdx) {
  const title = prompt("网站名称：");
  const url = prompt("网址 (例如 https://example.com)：");
  if (!title || !url) return;
  state.groups[groupIdx].links.push({ title, url });
  saveToServer();
};

window.deleteLink = function(groupIdx, linkIdx) {
  if(confirm("确定删除？")) {
    state.groups[groupIdx].links.splice(linkIdx, 1);
    saveToServer();
  }
};

window.deleteGroup = function(groupIdx) {
  if(confirm("确定删除整个分组及其下的所有网址吗？")) {
    state.groups.splice(groupIdx, 1);
    saveToServer();
  }
};

async function saveToServer() {
  if (!state.isAdmin) return;
  renderDOM(); // 立即渲染前端
  
  const res = await fetch('/api/save-links', {
    method: 'POST',
    body: JSON.stringify({ password: state.adminPassword, data: { groups: state.groups } })
  });
  const result = await res.json();
  if(!result.success) alert("同步失败：" + result.error);
}
