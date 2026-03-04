(function() {
    function init() {
        console.log("[Transactions] Initializing list and filters...");
        const tableBody = document.querySelector('.transactions-table tbody');
        const tableEl = document.querySelector('.transactions-table');
        const modal = document.getElementById('transactionModal');
        const btnAdd = document.getElementById('btnAddRecipt');
        const btnCancel = document.getElementById('btnCancel');
        const form = document.getElementById('transactionForm');
        
        const contextMenu = document.getElementById('contextMenu');
        const cmAskJoule = document.getElementById('cmAskJoule');
        const cmEdit = document.getElementById('cmEdit');
        const cmDelete = document.getElementById('cmDelete');
        const searchInput = document.getElementById('globalSearch');

        let selectedTransactionId = null;
        let currentCategoryFilter = 'all';
        let currentSearchQuery = '';
        let currentPriceFilter = '';
        let currentDateFilter = '';
        let currentIdFilter = '';
        let currentSortColumn = 'timestamp';
        let currentSortOrder = 'DESC';
        
        let allEntries = [];
        let currentOffset = 0;
        const PAGE_SIZE = 25;
        let isLoading = false;
        let hasMore = true;

        const columnMap = {
            'Category': 'kategorie', 'Sender': 'sender', 'Recipient': 'empfaenger',
            'Amount': 'wert', 'Date': 'timestamp', 'kategorie': 'Category',
            'sender': 'Sender', 'empfaenger': 'Recipient', 'wert': 'Amount', 'timestamp': 'Date'
        };

        function loadTransactions(append = false) {
            if (isLoading || (!hasMore && append)) return;
            isLoading = true;
            if (!append) {
                currentOffset = 0; hasMore = true;
                if (tableEl) tableEl.classList.add('is-loading');
            }

            const userStr = localStorage.getItem('clarityUser');
            let userIdQuery = '';
            let companyIdQuery = '';
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.id) userIdQuery = `&user_id=${user.id}`;
                    if (user.company_id) companyIdQuery = `&company_id=${user.company_id}`;
                } catch(e) {}
            }

            let url = `/api/transactions?limit=${PAGE_SIZE}&offset=${currentOffset}${userIdQuery}${companyIdQuery}`;
            if (currentCategoryFilter !== 'all') url += `&category=${encodeURIComponent(currentCategoryFilter)}`;
            if (currentSearchQuery) url += `&search=${encodeURIComponent(currentSearchQuery)}`;
            if (currentDateFilter) url += `&date=${encodeURIComponent(currentDateFilter)}`;
            if (currentIdFilter) url += `&id=${encodeURIComponent(currentIdFilter)}`;
            url += `&sort=${currentSortColumn}&order=${currentSortOrder}`;

            console.log(`[Transactions] Fetching: ${url}`);

            fetch(url)
                .then(res => res.json())
                .then(data => {
                    const newEntries = data.eintraege || [];
                    if (!append) { allEntries = newEntries; if (tableBody) tableBody.innerHTML = ''; }
                    else { allEntries = allEntries.concat(newEntries); }
                    if (newEntries.length < PAGE_SIZE) hasMore = false;
                    isLoading = false; currentOffset += newEntries.length;
                    if (tableEl) tableEl.classList.remove('is-loading');
                    updateHeaderTags();
                    renderTable(allEntries, append);
                })
                .catch(err => {
                    console.error("Error loading transactions:", err);
                    isLoading = false; if (tableEl) tableEl.classList.remove('is-loading');
                });
        }

        function syncSearchActiveClass() {
            const isSearching = !!(currentSearchQuery || currentIdFilter || currentDateFilter);
            document.body.classList.toggle('search-active', isSearching);
        }

        function updateHeaderTags() {
            const titleEl = document.querySelector('.transactions-title');
            if (!titleEl) return;
            let html = 'Transactions';
            if (currentIdFilter) html += ` <span style="font-size: 0.5em; vertical-align: middle; background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; margin-left: 10px; font-weight: bold; display: inline-block;">Item ID: ${currentIdFilter} <span id="clearIdFilter" style="cursor:pointer; margin-left: 5px; font-weight: bold;">×</span></span>`;
            if (currentCategoryFilter !== 'all') html += ` <span style="font-size: 0.5em; vertical-align: middle; background: #f3f0ff; color: #6f42c1; padding: 4px 12px; border-radius: 12px; margin-left: 10px; font-weight: bold; display: inline-block;">${currentCategoryFilter} <span id="clearCatFilter" style="cursor:pointer; margin-left: 5px; font-weight: bold;">×</span></span>`;
            if (currentDateFilter) html += ` <span style="font-size: 0.5em; vertical-align: middle; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; margin-left: 10px; font-weight: bold; display: inline-block;">${currentDateFilter} <span id="clearDateFilter" style="cursor:pointer; margin-left: 5px; font-weight: bold;">×</span></span>`;
            if (currentSearchQuery) html += ` <span style="font-size: 0.5em; vertical-align: middle; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 12px; margin-left: 10px; font-weight: bold; display: inline-block;">"${currentSearchQuery}" <span id="clearSearchFilter" style="cursor:pointer; margin-left: 5px; font-weight: bold;">×</span></span>`;
            if (currentSortColumn !== 'timestamp' || currentSortOrder !== 'DESC') {
                const colLabel = columnMap[currentSortColumn] || currentSortColumn;
                html += ` <span style="font-size: 0.5em; vertical-align: middle; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; margin-left: 10px; font-weight: bold; display: inline-block;">Sorted: ${colLabel} ${currentSortOrder.toLowerCase()} <span id="clearSortFilter" style="cursor:pointer; margin-left: 5px; font-weight: bold;">×</span></span>`;
            }
            titleEl.innerHTML = html;
            const cId = document.getElementById('clearIdFilter'); if (cId) cId.onclick = (e) => { e.stopPropagation(); currentIdFilter = ''; syncSearchActiveClass(); loadTransactions(false); };
            const cCat = document.getElementById('clearCatFilter'); if (cCat) cCat.onclick = (e) => { e.stopPropagation(); currentCategoryFilter = 'all'; syncSearchActiveClass(); applyFilter(); };
            const cDate = document.getElementById('clearDateFilter'); if (cDate) cDate.onclick = (e) => { e.stopPropagation(); currentDateFilter = ''; syncSearchActiveClass(); loadTransactions(false); };
            const cSearch = document.getElementById('clearSearchFilter'); if (cSearch) cSearch.onclick = (e) => { 
                e.stopPropagation(); 
                currentSearchQuery = ''; 
                currentDateFilter = '';
                currentIdFilter = ''; 
                if(searchInput) searchInput.value = ''; 
                syncSearchActiveClass();
                loadTransactions(false); 
            };
            const cSort = document.getElementById('clearSortFilter'); if (cSort) cSort.onclick = (e) => {
                e.stopPropagation(); currentSortColumn = 'timestamp'; currentSortOrder = 'DESC';
                document.querySelectorAll('.transactions-table th').forEach(h => h.innerHTML = h.textContent.replace(' ▲', '').replace(' ▼', ''));
                loadTransactions(false);
            };
        }

        function applyFilter() {
            document.dispatchEvent(new CustomEvent('categoryChanged', { detail: { category: currentCategoryFilter } }));
            loadTransactions(false);
        }

        document.querySelectorAll('.transactions-table th').forEach(th => {
            const dbCol = columnMap[th.textContent.trim().replace(' ▲', '').replace(' ▼', '')];
            if (dbCol) {
                th.style.cursor = 'pointer'; th.title = 'Click to sort';
                th.onclick = () => {
                    if (currentSortColumn === dbCol) currentSortOrder = (currentSortOrder === 'ASC' ? 'DESC' : 'ASC');
                    else { currentSortColumn = dbCol; currentSortOrder = 'ASC'; }
                    document.querySelectorAll('.transactions-table th').forEach(h => h.innerHTML = h.textContent.replace(' ▲', '').replace(' ▼', ''));
                    th.innerHTML += (currentSortOrder === 'ASC' ? ' ▲' : ' ▼');
                    loadTransactions(false);
                };
            }
        });

        if (searchInput) {
            const clearSearchBtn = document.getElementById('clearSearch');
            let timeout;
            searchInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                
                if (val && currentCategoryFilter !== 'all') {
                    currentCategoryFilter = 'all';
                    updateHeaderTags();
                    document.dispatchEvent(new CustomEvent('categoryChanged', { detail: { category: 'all' } }));
                }

                document.body.classList.toggle('search-active', !!val);

                if (clearSearchBtn) clearSearchBtn.style.display = val ? 'block' : 'none';
                if (!val || val === '-' || val === '+') {
                    currentSearchQuery = '';
                    currentDateFilter = '';
                    document.body.classList.remove('search-active');
                    loadTransactions(false);
                    return;
                }
                clearTimeout(timeout);
                timeout = setTimeout(() => { 
                    const datePattern = /^(\d{4}-\d{2}-\d{2})|(\d{2}\.\d{2}\.\d{4})$/;
                    if (datePattern.test(val)) {
                        let dateVal = val;
                        if (val.includes('.')) {
                            const [d, m, y] = val.split('.');
                            dateVal = `${y}-${m}-${d}`;
                        }
                        currentDateFilter = dateVal;
                        currentSearchQuery = '';
                    } else {
                        currentSearchQuery = val.replace(',', '.').replace('€', '');
                    }
                    
                    if (currentSearchQuery) currentDateFilter = '';
                    loadTransactions(false); 
                }, 300);
            });

            if (clearSearchBtn) {
                clearSearchBtn.onclick = () => {
                    searchInput.value = '';
                    clearSearchBtn.style.display = 'none';
                    currentSearchQuery = '';
                    currentDateFilter = '';
                    document.body.classList.remove('search-active');
                    loadTransactions(false);
                };
            }
        }

        function renderTable(entries, append = false) {
            if (!entries || entries.length === 0) { if (tableBody && !append) tableBody.innerHTML = `<tr><td colspan="5" class="empty">No entries found</td></tr>`; return; }
            if (tableBody) {
                tableBody.innerHTML = '';
                entries.forEach(e => {
                    const tr = document.createElement('tr'); tr.dataset.id = e.id; tr.dataset.raw = JSON.stringify(e);
                    const val = parseFloat(e.wert);
                    tr.innerHTML = `
                        <td class="cat-cell" style="cursor:pointer;color:#6f42c1;font-weight:500;">${e.kategorie}</td>
                        <td>${e.sender || '-'}</td><td>${e.empfaenger || '-'}</td>
                        <td style="color:${val>=0?'#28a745':'#dc3545'};font-weight:bold">${val>=0?'+':''}${val.toFixed(2)}€</td>
                        <td class="date-cell" style="cursor:pointer;color:#0070d2;">${new Date(e.timestamp).toLocaleDateString('en-US')}</td>
                    `;
                    tr.querySelector('.cat-cell').onclick = (ev) => { ev.stopPropagation(); currentCategoryFilter = e.kategorie; applyFilter(); };
                    tr.querySelector('.date-cell').onclick = (ev) => { ev.stopPropagation(); currentDateFilter = e.timestamp.split('T')[0]; loadTransactions(false); };
                    tr.oncontextmenu = (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        selectedTransactionId = e.id;
                        if (contextMenu) {
                            contextMenu.style.display = 'block';
                            contextMenu.style.left = ev.clientX + 'px';
                            contextMenu.style.top = ev.clientY + 'px';
                            const vHeight = window.innerHeight;
                            const menuHeight = contextMenu.offsetHeight;
                            if (ev.clientY + menuHeight > vHeight) {
                                contextMenu.style.top = (ev.clientY - menuHeight) + 'px';
                            }
                        }
                    };
                    tableBody.appendChild(tr);
                });
            }
        }

        window.addEventListener('scroll', () => { if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) if (hasMore && !isLoading) loadTransactions(true); });
        window.onclick = () => { if(contextMenu) contextMenu.style.display = 'none'; if(modal && event.target == modal) modal.style.display = 'none'; };
        
        if (cmAskJoule) cmAskJoule.onclick = () => {
            const row = document.querySelector(`tr[data-id="${selectedTransactionId}"]`);
            if (row) document.dispatchEvent(new CustomEvent('attachToJoule', { detail: { transaction: JSON.parse(row.dataset.raw) } }));
            if (contextMenu) contextMenu.style.display = 'none';
        };

        cmDelete.onclick = () => {
            if (selectedTransactionId && confirm('Really delete?')) {
                const userStr = localStorage.getItem('clarityUser');
                let companyIdQuery = '';
                if (userStr) {
                    const user = JSON.parse(userStr);
                    if (user.company_id) companyIdQuery = `?company_id=${user.company_id}`;
                }
                fetch('/api/transactions/' + selectedTransactionId + companyIdQuery, { method: 'DELETE' }).then(() => { loadTransactions(); document.dispatchEvent(new Event('dataUpdated')); });
            }
        };

        cmEdit.onclick = () => {
            const row = document.querySelector(`tr[data-id="${selectedTransactionId}"]`); if (!row) return;
            const data = JSON.parse(row.dataset.raw);
            document.getElementById('tName').value = data.name; document.getElementById('tKategorie').value = data.kategorie;
            document.getElementById('tWert').value = Math.abs(data.wert); document.getElementById('tSender').value = data.sender || '';
            document.getElementById('tEmpfaenger').value = data.empfaenger || ''; document.getElementById('tType').value = data.wert >= 0 ? 'income' : 'expense';
            if (data.timestamp) document.getElementById('tDate').value = data.timestamp.split('T')[0];
            form.dataset.editId = selectedTransactionId; modal.style.display = 'flex';
        };

        form.onsubmit = (e) => {
            e.preventDefault(); const editId = form.dataset.editId; let wert = parseFloat(document.getElementById('tWert').value);
            if (document.getElementById('tType').value === 'expense') wert = -Math.abs(wert);
            const userStr = localStorage.getItem('clarityUser');
            let userId = null; let companyId = null;
            if (userStr) { const user = JSON.parse(userStr); userId = user.id; companyId = user.company_id; }

            const payload = {
                name: document.getElementById('tName').value, kategorie: document.getElementById('tKategorie').value,
                wert: wert, sender: document.getElementById('tSender').value, empfaenger: document.getElementById('tEmpfaenger').value,
                timestamp: new Date(document.getElementById('tDate').value).toISOString(),
                user_id: userId, company_id: companyId
            };
            fetch(editId ? '/api/transactions/' + editId : '/api/transactions', {
                method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            }).then(() => { modal.style.display = 'none'; form.reset(); delete form.dataset.editId; loadTransactions(); document.dispatchEvent(new Event('dataUpdated')); });
        };

        btnAdd.onclick = () => { if (form) form.reset(); delete form.dataset.editId; document.getElementById('tDate').value = new Date().toISOString().split('T')[0]; modal.style.display = 'flex'; };
        if (btnCancel) btnCancel.onclick = () => modal.style.display = 'none';

        loadTransactions();
        document.addEventListener('forceFilter', (e) => {
            console.log("[Transactions] Force filter event received:", e.detail);
            const { category, date, search, id } = e.detail;
            if (id !== undefined) {
                currentIdFilter = id;
                if (id) { currentCategoryFilter = 'all'; currentDateFilter = ''; currentSearchQuery = ''; if (searchInput) searchInput.value = ''; }
            } else {
                if (category !== undefined) currentCategoryFilter = category;
                if (date !== undefined) currentDateFilter = date;
                if (search !== undefined) { currentSearchQuery = search; if (searchInput) searchInput.value = search; }
                currentIdFilter = ''; 
            }
            syncSearchActiveClass();
            loadTransactions(false);
            document.dispatchEvent(new CustomEvent('categoryChanged', { detail: { category: currentCategoryFilter } }));
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
