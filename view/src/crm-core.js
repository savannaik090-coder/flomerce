/**
 * CRM CORE LOGIC
 * Contains functionality for:
 * - Firebase Firestore integration and initialization
 * - Client record management (Create, Read, Update, Delete)
 * - Client list rendering and filtering (Category, Status, Search)
 * - Tag management system (Add, Edit, Remove tags)
 * - Duplicate record detection and form handling
 * - UI state management (Loading, Modals, Resets)
 */

// Isolated CRM logic
(function() {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not found!");
        return;
    }

    const crmDb = firebase.firestore();
    let allClients = [];
    const loadingOverlay = document.getElementById('loading-overlay');

    document.addEventListener('DOMContentLoaded', () => {
        // Ensure Firebase is initialized before loading clients
        if (typeof firebase !== 'undefined') {
            loadClients();
        } else {
            console.error("Firebase not loaded");
            if (loadingOverlay) {
                loadingOverlay.innerHTML = "<div style='color:red; text-align:center;'><h3>Error: Firebase not loaded</h3><p>Please check your internet connection and reload.</p></div>";
            }
        }
    });

    async function loadClients() {
        if (!loadingOverlay) return;
        showLoading(true);
        try {
            const snapshot = await crmDb.collection('crm_entries').orderBy('updatedAt', 'desc').get();
            allClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderFilteredClients();
        } catch (e) { 
            console.error("Firebase error:", e);
        }
        finally { showLoading(false); }
    }

    function renderFilteredClients() {
        const urlParams = new URLSearchParams(window.location.search);
        const catFilter = urlParams.get('cat');
        const statusFilter = urlParams.get('status');
        
        const listTitle = document.getElementById('list-title');
        
        let filtered = allClients;
        if (catFilter && statusFilter) {
            filtered = allClients.filter(c => c.category === catFilter && c.status === statusFilter);
            if (listTitle) listTitle.innerText = `${catFilter} > ${statusFilter}`;
        } else {
            if (listTitle) listTitle.innerText = "All Clients";
        }
        
        renderClients(filtered);
    }

    function renderClients(clients) {
        const list = document.getElementById('client-list');
        if (!list) return;
        list.innerHTML = '';
        
        const counts = {};
        clients.forEach(c => {
            const card = createCard(c);
            list.appendChild(card);
            counts[c.status] = (counts[c.status] || 0) + 1;
        });

        const totalCountSpan = document.getElementById('client-count');
        if (totalCountSpan) {
            totalCountSpan.innerText = `Total: ${clients.length}`;
        }
    }

    function createCard(c) {
        const div = document.createElement('div');
        const statusClass = (c.status || 'newlead').replace(/ /g,'').toLowerCase();
        div.className = `client-card status-${statusClass}`;
        
        // Ensure tags is always an array
        const tags = Array.isArray(c.tags) ? c.tags : [];
        
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items: start;">
                <div>
                    <span style="font-size: 0.7rem; background: #eee; padding: 2px 6px; border-radius: 4px; color: #666; margin-bottom: 4px; display: inline-block;">${c.category || 'Jewellery'}</span>
                    <br>
                    <strong>${c.name || 'No Name'}</strong>
                </div>
                <small>${c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'N/A'}</small>
            </div>
            <div style="font-size:0.8em; margin-top: 5px; color: #666; word-break: break-word;">
                ${c.mobile || ''} ${c.instagramId ? '| <span style="display:inline-block; max-width:100%; overflow:hidden; text-overflow:ellipsis; vertical-align:bottom;">' + c.instagramId + '</span>' : ''}
            </div>
            ${c.notes ? `<div style="font-size:0.75em; margin-top: 8px; font-style: italic; color: #888; border-top: 1px solid #eee; padding-top: 5px;">${c.notes.substring(0, 50)}${c.notes.length > 50 ? '...' : ''}</div>` : ''}
            
            <div class="tags-container" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px;">
                ${tags.map(tag => `
                    <span class="tag" style="font-size: 0.65rem; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" onclick="event.stopPropagation(); editTag('${c.id}', '${tag}')">
                        ${tag}
                        <i class="fas fa-times" style="cursor: pointer; font-size: 0.6rem;" onclick="event.stopPropagation(); removeTag('${c.id}', '${tag}')"></i>
                    </span>
                `).join('')}
                <button class="add-tag-btn" style="font-size: 0.65rem; background: #f3f4f6; border: 1px dashed #d1d5db; color: #6b7280; padding: 2px 8px; border-radius: 999px; cursor: pointer;" onclick="event.stopPropagation(); showTagInput('${c.id}')">
                    + Tag
                </button>
            </div>
            <div id="tag-input-container-${c.id}" style="display: none; margin-top: 8px;">
                <div id="predefined-tags-${c.id}" style="display: flex; gap: 5px; margin-bottom: 5px; flex-wrap: wrap;">
                    <span style="font-size: 0.65rem; background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 999px; cursor: pointer; border: 1px solid #fee2e2;" onclick="event.stopPropagation(); addPredefinedTag('${c.id}', 'Important')">Important</span>
                    <span style="font-size: 0.65rem; background: #ecfdf5; color: #059669; padding: 2px 8px; border-radius: 999px; cursor: pointer; border: 1px solid #d1fae5;" onclick="event.stopPropagation(); addPredefinedTag('${c.id}', 'High Budget')">High Budget</span>
                </div>
                <input type="text" id="tag-input-${c.id}" placeholder="Enter tag..." style="font-size: 0.75rem; padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100px;" onkeyup="if(event.key === 'Enter') addTag('${c.id}')">
                <button onclick="event.stopPropagation(); addTag('${c.id}')" style="font-size: 0.75rem; background: var(--primary); color: white; border: none; padding: 4px 8px; border-radius: 4px; margin-left: 4px; cursor: pointer;">Add</button>
            </div>
        `;
        div.onclick = () => editClient(c.id);
        return div;
    }

    window.showTagInput = function(id) {
        const container = document.getElementById(`tag-input-container-${id}`);
        if (container) {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
            if (container.style.display === 'block') {
                const input = document.getElementById(`tag-input-${id}`);
                if (input) {
                    input.value = ''; // Reset input
                    input.placeholder = "Enter tag...";
                    input.focus();
                }
                // Show predefined options
                const predefined = document.getElementById(`predefined-tags-${id}`);
                if (predefined) predefined.style.display = 'flex';
            }
        }
    };

    window.addPredefinedTag = function(id, tag) {
        const input = document.getElementById(`tag-input-${id}`);
        if (input) {
            input.value = tag;
            addTag(id);
        }
    };

    window.editTag = function(id, oldTag) {
        const container = document.getElementById(`tag-input-container-${id}`);
        const input = document.getElementById(`tag-input-${id}`);
        if (container && input) {
            container.style.display = 'block';
            input.value = oldTag;
            input.focus();
            // Store the tag being edited
            input.dataset.editingTag = oldTag;
            
            // Add a remove button if it doesn't exist
            let removeBtn = document.getElementById(`remove-tag-btn-${id}`);
            if (!removeBtn) {
                removeBtn = document.createElement('button');
                removeBtn.id = `remove-tag-btn-${id}`;
                removeBtn.innerHTML = 'Remove';
                removeBtn.style.cssText = 'font-size: 0.75rem; background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 4px; margin-left: 4px; cursor: pointer;';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    const tagToDelete = input.dataset.editingTag;
                    if (tagToDelete) {
                        removeTag(id, tagToDelete);
                        container.style.display = 'none';
                        delete input.dataset.editingTag;
                    }
                };
                input.parentNode.appendChild(removeBtn);
            } else {
                removeBtn.style.display = 'inline-block';
            }
        }
    };

    window.addTag = async function(id) {
        const input = document.getElementById(`tag-input-${id}`);
        const removeBtn = document.getElementById(`remove-tag-btn-${id}`);
        if (!input) return;
        const tag = input.value.trim();
        if (!tag) return;

        const client = allClients.find(c => c.id === id);
        if (!client) return;

        let currentTags = Array.isArray(client.tags) ? client.tags : [];
        const oldTag = input.dataset.editingTag;

        if (oldTag) {
            currentTags = currentTags.filter(t => t !== oldTag);
            delete input.dataset.editingTag;
            if (removeBtn) removeBtn.style.display = 'none';
        }

        if (currentTags.includes(tag)) {
            input.value = '';
            document.getElementById(`tag-input-container-${id}`).style.display = 'none';
            return;
        }

        const newTags = [...currentTags, tag];
        
        try {
            await crmDb.collection('crm_entries').doc(id).update({
                tags: newTags,
                updatedAt: Date.now()
            });
            input.value = '';
            document.getElementById(`tag-input-container-${id}`).style.display = 'none';
            await loadClients();
        } catch (e) {
            console.error("Tag add error:", e);
        }
    };

    window.removeTag = async function(id, tagToRemove) {
        const client = allClients.find(c => c.id === id);
        if (!client) return;

        const currentTags = Array.isArray(client.tags) ? client.tags : [];
        const newTags = currentTags.filter(t => t !== tagToRemove);

        try {
            await crmDb.collection('crm_entries').doc(id).update({
                tags: newTags,
                updatedAt: Date.now()
            });
            await loadClients();
        } catch (e) {
            console.error("Tag remove error:", e);
        }
    };

    window.handleFormSubmit = async function(e) {
        e.preventDefault();
        const id = document.getElementById('client-id').value;
        const data = getFormData();
        
        // 1. COMPLETELY BYPASS DUPLICATE CHECK FOR EDITS
        // If we have an ID, we are updating an existing record, so duplicates don't matter.
        if (id) {
            document.getElementById('duplicate-warning').style.display = 'none';
            await saveClient();
            return;
        }

        // 2. ONLY CHECK FOR DUPLICATES ON BRAND NEW RECORDS
        // Clean data for reliable comparison
        const cleanMobile = data.mobile.replace(/\D/g, '');
        const cleanInsta = data.instagramId.toLowerCase().replace('@', '').trim();
        const cleanEmail = data.email.toLowerCase().trim();

        const dup = allClients.find(c => {
            // Only match if the user actually entered valid, non-empty data
            const mobileMatch = cleanMobile.length >= 10 && c.mobile && c.mobile.replace(/\D/g, '') === cleanMobile;
            const instaMatch = cleanInsta.length >= 3 && c.instagramId && c.instagramId.toLowerCase().replace('@', '').trim() === cleanInsta;
            const emailMatch = cleanEmail.length >= 5 && cleanEmail.includes('@') && c.email && c.email.toLowerCase().trim() === cleanEmail;
            
            return mobileMatch || instaMatch || emailMatch;
        });

        if (dup) {
            document.getElementById('duplicate-warning').style.display = 'block'; 
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return; 
        }
        
        document.getElementById('duplicate-warning').style.display = 'none';
        await saveClient();
    };

    window.saveClient = async function(bypass = false) {
        if (bypass) {
            document.getElementById('duplicate-warning').style.display = 'none';
        }
        
        showLoading(true);
        const id = document.getElementById('client-id').value;
        const data = getFormData();
        data.updatedAt = Date.now();
        
        try {
            if(id) {
                await crmDb.collection('crm_entries').doc(id).update(data);
            } else {
                data.createdAt = Date.now();
                await crmDb.collection('crm_entries').add(data);
            }
            resetForm();
            await loadClients();
        } catch(e) { 
            console.error("Save error:", e);
            alert('Save failed: ' + e.message); 
        }
        finally { showLoading(false); }
    };

    window.handleDelete = async function() {
        const id = document.getElementById('client-id').value;
        if (!id) return;
        
        if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) return;
        
        showLoading(true);
        try {
            await crmDb.collection('crm_entries').doc(id).delete();
            resetForm();
            await loadClients();
        } catch (e) {
            console.error("Delete error:", e);
            alert('Delete failed: ' + e.message);
        } finally {
            showLoading(false);
        }
    };

    window.resetForm = function() {
        const form = document.getElementById('client-form');
        if (form) form.reset();
        document.getElementById('client-id').value = '';
        document.getElementById('submit-btn').innerText = 'Save Client';
        document.getElementById('form-title').innerText = 'Client Information';
        document.getElementById('duplicate-warning').style.display = 'none';
        const deleteBtn = document.getElementById('delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) submitBtn.style.width = '100%';
    };

    window.filterClients = function() {
        const query = document.getElementById('search-query').value.toLowerCase();
        const sortBy = document.getElementById('sort-by').value;
        
        const urlParams = new URLSearchParams(window.location.search);
        const catFilter = urlParams.get('cat');
        const statusFilter = urlParams.get('status');

        let filtered = allClients.filter(c => {
            const matchesQuery = !query || 
                (c.name && c.name.toLowerCase().includes(query)) ||
                (c.mobile && c.mobile.includes(query)) ||
                (c.instagramId && c.instagramId.toLowerCase().includes(query)) ||
                (c.email && c.email.toLowerCase().includes(query));
                
            const matchesCategory = !catFilter || c.category === catFilter;
            const matchesStatus = !statusFilter || c.status === statusFilter;

            return matchesQuery && matchesCategory && matchesStatus;
        });

        if (sortBy === 'name') {
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sortBy === 'oldest') {
            filtered.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
        } else {
            filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        }
        
        renderClients(filtered);
    };

    window.hideDuplicateWarning = function() {
        document.getElementById('duplicate-warning').style.display = 'none';
    };

    function getFormData() {
        return {
            name: document.getElementById('client-name').value.trim(),
            instagramId: document.getElementById('client-insta').value.trim(),
            mobile: document.getElementById('client-mobile').value.trim(),
            email: document.getElementById('client-email').value.trim(),
            category: document.getElementById('client-category').value,
            status: document.getElementById('client-status').value,
            notes: document.getElementById('client-notes').value.trim()
        };
    }

    function editClient(id) {
        const c = allClients.find(x => x.id === id);
        if (!c) return;
        document.getElementById('client-id').value = c.id;
        document.getElementById('client-name').value = c.name || '';
        document.getElementById('client-insta').value = c.instagramId || '';
        document.getElementById('client-mobile').value = c.mobile || '';
        document.getElementById('client-email').value = c.email || '';
        document.getElementById('client-category').value = c.category || 'Jewellery';
        document.getElementById('client-status').value = c.status || 'New Lead';
        document.getElementById('client-notes').value = c.notes || '';
        document.getElementById('submit-btn').innerText = 'Update Client';
        document.getElementById('submit-btn').style.width = 'auto';
        document.getElementById('form-title').innerText = 'Edit Client';
        const deleteBtn = document.getElementById('delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'flex';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showLoading(s) { 
        if (loadingOverlay) loadingOverlay.style.display = s ? 'flex' : 'none'; 
    }
})();