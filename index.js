// ==UserScript==
// @name      便捷复制
// @include  */
// @include  */subject/*
// @include  */character/*
// @include  */person/*
// @exclude  */subject/*/*
// @exclude  */character/*/*
// @exclude  */person/*/*
// ==/UserScript==
(function () {
  const trackedPagesManager = {
    getTrackedPages() {
      try {
        const stored = localStorage.getItem('trackedPages');
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Error reading trackedPages from localStorage:', error);
        return [];
      }
    },

    saveTrackedPages(pages) {
      try {
        localStorage.setItem('trackedPages', JSON.stringify(pages));
      } catch (error) {
        console.error('Error saving trackedPages to localStorage:', error);
      }
    },

    addPage(title, url, type, titleCh) {
      const pages = this.getTrackedPages();
      const newPage = {
        title,
        url,
        type,
        titleCh,
        id: Date.now()
      };
      if (!pages.some(page => page.url === url)) {
        pages.push(newPage);
        this.saveTrackedPages(pages);
      }
    },

    removePage(id) {
      const pages = this.getTrackedPages().filter(page => page.id !== id);
      this.saveTrackedPages(pages);
      return pages;
    },

    clearAll() {
      this.saveTrackedPages([]);
    }
  };

  const modalManager = {
    selectedPages: new Set(), // 存储选中的页面ID

    init() {
      this.createModal();
      this.bindEvents();
    },

    createModal() {
      this.modal = document.createElement('div');
      this.modal.id = 'trackedPagesModal';

      this.overlay = document.createElement('div');
      this.overlay.className = 'modal-overlay';

      this.modalContent = document.createElement('div');
      this.modalContent.className = 'modal-content';

      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';

      const title = document.createElement('h3');
      title.textContent = '历史页面';

      this.closeBtn = document.createElement('button');
      this.closeBtn.className = 'close-btn';
      this.closeBtn.innerHTML = '&times;';

      modalHeader.appendChild(title);
      modalHeader.appendChild(this.closeBtn);

      this.modalBody = document.createElement('div');
      this.modalBody.className = 'modal-body';

      // 创建标签页容器
      this.tabContainer = document.createElement('div');
      this.tabContainer.className = 'tab-container';
      this.tabs = [
        { label: '全部', value: 'all' },
        { label: '条目', value: 'subject' },
        { label: '角色', value: 'character' },
        { label: '人物', value: 'person' }
      ];
      this.activeTab = 'all';
      this.tabButtons = {};
      this.tabs.forEach(tab => {
        const btn = document.createElement('span');
        btn.className = 'tab-btn';
        btn.textContent = tab.label;
        btn.dataset.tab = tab.value;
        if (tab.value === this.activeTab) btn.classList.add('active');
        btn.addEventListener('click', () => {
          this.activeTab = tab.value;
          Object.values(this.tabButtons).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderList();
        });
        this.tabButtons[tab.value] = btn;
        this.tabContainer.appendChild(btn);
      });
      this.modalBody.appendChild(this.tabContainer);

      this.listContainer = document.createElement('div');
      this.listContainer.id = 'trackedPagesList';
      this.modalBody.appendChild(this.listContainer);

      // 创建结果显示区域
      this.urlResult = document.createElement('div');
      this.urlResult.className = 'url-result';
      this.urlResult.style.display = 'none';
      this.modalBody.appendChild(this.urlResult);

      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer';

      // 创建生成URL按钮
      this.generateUrlBtn = document.createElement('button');
      this.generateUrlBtn.id = 'generateUrlBtn';
      this.generateUrlBtn.textContent = '生成链接';

      this.clearBtn = document.createElement('button');
      this.clearBtn.id = 'clearAllBtn';
      this.clearBtn.textContent = '清空';

      modalFooter.appendChild(this.generateUrlBtn);
      modalFooter.appendChild(this.clearBtn);

      this.modalContent.appendChild(modalHeader);
      this.modalContent.appendChild(this.modalBody);
      this.modalContent.appendChild(modalFooter);

      this.modal.appendChild(this.overlay);
      this.modal.appendChild(this.modalContent);

      document.body.appendChild(this.modal);
    },

    bindEvents() {
      this.closeBtn.addEventListener('click', () => this.hide());
      this.overlay.addEventListener('click', () => this.hide());
      this.clearBtn.addEventListener('click', () => this.clearAll());
      this.generateUrlBtn.addEventListener('click', () => this.generateUrls());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal.style.display !== 'none') {
          this.hide();
        }
      });
    },

    show() {
      this.renderList();
      this.modal.style.display = 'block';
    },

    hide() {
      this.modal.style.display = 'none';
      this.urlResult.style.display = 'none'; // 隐藏结果
    },

    renderList() {
      const allPages = trackedPagesManager.getTrackedPages();
      let pages;
      if (this.activeTab === 'all') {
        pages = allPages;
      } else {
        // 通过url中间的字母部分筛选
        pages = allPages.filter(page => {
          // 例如 /subject/1234
          const match = page.url && page.url.match(/^\/(subject|character|person)\//);
          return match && match[1] === this.activeTab;
        });
      }
      this.listContainer.innerHTML = '';
      this.selectedPages.clear(); // 清空选中状态

      if (pages.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = '暂无历史记录';
        this.listContainer.appendChild(emptyMessage);
        this.clearBtn.disabled = true;
        this.generateUrlBtn.disabled = true;
        return;
      }

      this.clearBtn.disabled = false;
      this.generateUrlBtn.disabled = false;

      pages.forEach(page => {
        const pageElement = document.createElement('div');
        pageElement.className = 'page-item';
        if (this.selectedPages.has(page.id)) {
          pageElement.classList.add('selected');
        }

        // 点击选中/取消选中
        pageElement.addEventListener('click', (e) => {
          if (e.target.classList.contains('delete-btn')) return;

          if (this.selectedPages.has(page.id)) {
            this.selectedPages.delete(page.id);
            pageElement.classList.remove('selected');
          } else {
            this.selectedPages.add(page.id);
            pageElement.classList.add('selected');
          }
        });

        const contentDiv = document.createElement('div');
        contentDiv.className = 'page-item-content';

        // 历史项目标题和类型生成
        const titleElement = document.createElement('div');
        titleElement.className = 'page-title';
        titleElement.textContent = this.escapeHtml(`${page.titleCh || page.title}` || '未知名称') + this.escapeHtml(page.type ? ` (${page.type})` : '');

        const urlElement = document.createElement('div');
        urlElement.className = 'page-url';
        urlElement.textContent = this.escapeHtml(page.url || 'No URL');

        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete this page';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          trackedPagesManager.removePage(page.id);
          this.selectedPages.delete(page.id);
          this.renderList();
        });

        contentDiv.appendChild(titleElement);
        contentDiv.appendChild(urlElement);
        pageElement.appendChild(contentDiv);
        pageElement.appendChild(deleteBtn);
        this.listContainer.appendChild(pageElement);
      });
    },

    clearAll() {
      if (confirm('确定清空历史队列吗？')) {
        trackedPagesManager.clearAll();
        this.selectedPages.clear();
        this.renderList();
      }
    },

    // 修改 generateUrls 方法
    generateUrls() {
      const pages = trackedPagesManager.getTrackedPages();
      const selectedPages = pages.filter(page => this.selectedPages.has(page.id));

      if (selectedPages.length === 0) {
        this.urlResult.textContent = 'No pages selected';
        this.urlResult.style.display = 'block';
        return;
      }

      // 生成三种格式
      const domin = window.location.origin
      const plainText = selectedPages.map(page => domin + page.url).join('、')
      const bbcode = selectedPages.map(page => `[url=${domin + page.url}]${page.titleCh || page.title}[/url]`).join('、');
      const wikiLinks = "bgm_id=" + selectedPages.map(page => page.url.match(/\d+$/)[0]).join(',');

      this.urlResult.innerHTML = `
        <div class="url-section">
            <div class="url-title">普通:</div>
            <div class="url-content">${this.escapeHtml(plainText)}</div>
        </div>
        <div class="url-section">
            <div class="url-title">BBcode:</div>
            <div class="url-content">${this.escapeHtml(bbcode)}</div>
        </div>
        <div class="url-section">
            <div class="url-title">维基链:</div>
            <div class="url-content">${this.escapeHtml(wikiLinks)}</div>
        </div>
    `;
      this.urlResult.style.display = 'block';
    },



    escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  };

  function initHotkeyListener() {
    document.addEventListener('keydown', function (event) {
      if (event.ctrlKey && event.altKey && event.key === 'h') {
        event.preventDefault();
        modalManager.show();
      }
    });
  }

  // window.addTrackedPage = function (title, url) {
  //   return trackedPagesManager.addPage(title, url);
  // };
  const pathname = window.location.pathname
  let title, type, titleCh // 原名、类型、中文名
  if (pathname != '/') {
    title = document.querySelector('.nameSingle a').textContent.trim()
    if (pathname.includes('/subject/')) {
      if(document.querySelector('.nameSingle small')) {
        type = document.querySelector('.nameSingle small').textContent.trim()
      }
      const infobox = document.getElementById('infobox');
      if (infobox) {
        const span = infobox.querySelectorAll('li')[0];
        if(span && span.textContent.includes('中文名: '))
        titleCh = span.textContent.replace(/^中文名: ?/, '').trim();
      }
    } else {
      titleCh = document.querySelector('.nameSingle small').textContent.trim()
      // type = pathname.includes('/person/') ? '人物' : '角色'
    }
    trackedPagesManager.addPage(title, pathname, type, titleCh);
  } 
  modalManager.init();
  initHotkeyListener();
}());