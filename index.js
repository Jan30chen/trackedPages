// ==UserScript==
// @name         便捷复制
// @include      */
// @include      */subject/*
// @include      */person/*
// @include      */character/*
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

    addPage(title, url) {
      const pages = this.getTrackedPages();
      const newPage = {
        title,
        url,
        id: Date.now()
      };
      pages.push(newPage);
      this.saveTrackedPages(pages);
      return newPage;
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
      const pages = trackedPagesManager.getTrackedPages();
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

        const titleElement = document.createElement('div');
        titleElement.className = 'page-title';
        titleElement.textContent = this.escapeHtml(page.title || 'Untitled');

        const urlElement = document.createElement('div');
        urlElement.className = 'page-url';
        urlElement.textContent = this.escapeHtml(page.url || 'No URL');

        const deleteBtn = document.createElement('button');
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
      const plainText = selectedPages.map(page =>  domin + page.url).join('、')
      const bbcode = selectedPages.map(page => `[url=${domin + page.url}]${page.title}[/url]`).join('、');
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

  if(window.location.pathname != '/') {
    trackedPagesManager.addPage(document.title.replace(/\s*\|\s*Bangumi\s*番组计划\s*$/, ''), window.location.pathname);
  }
  modalManager.init();
  initHotkeyListener();
}());