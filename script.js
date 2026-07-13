/**
 * Premium Mobile Note Engine & Native Dialogue Subsystems
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================================================
    // SYSTEM ARCHITECTURE APPLICATION BLOB DATA
    // ==========================================================================
    const state = {
        currentView: 'dashboard', 
        activeEditingNoteId: null, 
        currentMode: 'text', 
        paperStyle: 'blank',
        paperTheme: 'cream',
        drawing: {
            isPen: true,
            color: '#0052cc',
            weight: 5,
            history: [],
            redoStack: []
        },
        activeSelectedNode: null
    };

    // DOM Selection Cache Matrix
    const dom = {
        viewDashboard: document.getElementById('home-dashboard-view'),
        viewEditor: document.getElementById('note-editor-view'),
        notesGrid: document.getElementById('notes-grid-container'),
        emptyState: document.getElementById('empty-state-container'),
        notesCounter: document.getElementById('notes-counter'),
        fabCreate: document.getElementById('fab-create-note'),
        
        btnBack: document.getElementById('btn-back-to-home'),
        btnSave: document.getElementById('btn-save-note'),
        editorTitleDisplay: document.getElementById('editor-current-title'),

        container: document.getElementById('note-container'),
        scrollContent: document.getElementById('scroll-content'),
        textEditor: document.getElementById('text-editor'),
        canvas: document.getElementById('drawing-canvas'),
        objectLayer: document.getElementById('object-layer'),
        imageLoader: document.getElementById('image-loader'),
        scrollHint: document.getElementById('scroll-hint-pill'),
        
        modeText: document.getElementById('mode-text'),
        modeDraw: document.getElementById('mode-draw'),
        modePage: document.getElementById('mode-page'),
        btnInsertImage: document.getElementById('btn-insert-image'),
        btnUndo: document.getElementById('btn-undo'),
        btnRedo: document.getElementById('btn-redo'),
        
        barText: document.getElementById('text-formatting-bar'),
        barDraw: document.getElementById('drawing-settings-bar'),
        barPage: document.getElementById('page-settings-bar'),
        
        btnBold: document.getElementById('btn-bold'),
        btnItalic: document.getElementById('btn-italic'),
        btnUnderline: document.getElementById('btn-underline'),
        btnStrike: document.getElementById('btn-strike'),
        btnListBullet: document.getElementById('btn-list-bullet'),
        btnListOrdered: document.getElementById('btn-list-ordered'),
        btnLeft: document.getElementById('btn-align-left'),
        btnCenter: document.getElementById('btn-align-center'),
        btnRight: document.getElementById('btn-align-right'),
        textColorPicker: document.getElementById('text-color-picker'),
        
        penColorPicker: document.getElementById('pen-color-picker'),
        penWeight: document.getElementById('pen-weight'),
        btnDrawPen: document.getElementById('btn-draw-pen'),
        btnDrawEraser: document.getElementById('btn-draw-eraser'),
        btnDrawClear: document.getElementById('btn-draw-clear'),

        // Custom Dialog Interface Hooks
        dialogOverlay: document.getElementById('custom-dialog-overlay'),
        dialogTitle: document.getElementById('dialog-box-title'),
        dialogMsg: document.getElementById('dialog-box-message'),
        dialogInputWrapper: document.getElementById('dialog-input-wrapper'),
        dialogInput: document.getElementById('dialog-text-input'),
        dialogBtnCancel: document.getElementById('dialog-btn-cancel'),
        dialogBtnConfirm: document.getElementById('dialog-btn-confirm')
    };

    const ctx = dom.canvas.getContext('2d');

    // ==========================================================================
    // ASYNC CUSTOM MOBILE DESIGN DIALOG DRIVER MODULE
    // ==========================================================================
    let currentDialogResolver = null;

    function openMobileModalFrame(type, title, message, defaultValue = "") {
        return new Promise((resolve) => {
            currentDialogResolver = resolve;
            
            dom.dialogTitle.textContent = title;
            dom.dialogMsg.textContent = message;
            dom.dialogInput.value = defaultValue;
            
            if (type === 'prompt') {
                dom.dialogInputWrapper.classList.remove('hidden-element');
                dom.dialogBtnCancel.classList.remove('hidden-element');
            } else if (type === 'confirm') {
                dom.dialogInputWrapper.classList.add('hidden-element');
                dom.dialogBtnCancel.classList.remove('hidden-element');
            } else if (type === 'alert') {
                dom.dialogInputWrapper.classList.add('hidden-element');
                dom.dialogBtnCancel.classList.add('hidden-element');
            }

            dom.dialogOverlay.classList.remove('hidden-element');
            dom.dialogOverlay.offsetWidth; 
            dom.dialogOverlay.classList.add('dialog-active-frame');
        });
    }

    function closeMobileModalFrame(resultValue) {
        dom.dialogOverlay.classList.remove('dialog-active-frame');
        setTimeout(() => {
            dom.dialogOverlay.classList.add('hidden-element');
            if (currentDialogResolver) {
                currentDialogResolver(resultValue);
                currentDialogResolver = null;
            }
        }, 250);
    }

    dom.dialogBtnConfirm.addEventListener('click', () => {
        const checkVisible = !dom.dialogInputWrapper.classList.contains('hidden-element');
        closeMobileModalFrame(checkVisible ? dom.dialogInput.value : true);
    });

    dom.dialogBtnCancel.addEventListener('click', () => closeMobileModalFrame(null));

    // ==========================================================================
    // UNCLIPPED PORTALED DROPDOWN SYSTEM ENGINE (WITH MUTUAL EXCLUSION FIX)
    // ==========================================================================
    function initializeUpwardDropdowns() {
        const dropdowns = document.querySelectorAll('.custom-dropdown-upward');
        
        dropdowns.forEach(dd => {
            const trigger = dd.querySelector('.dropdown-trigger-btn');
            const panel = dd.querySelector('.dropdown-menu-panel');
            
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                
                document.querySelectorAll('body > .dropdown-menu-panel').forEach(openPanel => {
                    if (openPanel !== panel) dismissPortaledMenuPanel(openPanel);
                });

                if (panel.parentNode === dd) {
                    document.body.appendChild(panel);
                    repositionPortaledMenuPanel(trigger, panel);
                } else {
                    dismissPortaledMenuPanel(panel);
                }
            });

            panel.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    panel.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('data-selected'));
                    item.classList.add('data-selected');
                    trigger.textContent = item.textContent;
                    
                    dismissPortaledMenuPanel(panel);
                    
                    const targetVal = item.dataset.value;
                    if (dd.id === 'dropdown-font-size') {
                        document.execCommand('fontSize', false, targetVal);
                        dom.textEditor.focus();
                    } else if (dd.id === 'dropdown-paper-style' || dd.id === 'dropdown-paper-color') {
                        updateNotebookPaperStyling();
                    }
                });
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('body > .dropdown-menu-panel').forEach(dismissPortaledMenuPanel);
        });

        document.querySelectorAll('.scrollable-toolbar-row').forEach(row => {
            row.addEventListener('scroll', () => {
                document.querySelectorAll('body > .dropdown-menu-panel').forEach(dismissPortaledMenuPanel);
            }, { passive: true });
        });
    }

    function repositionPortaledMenuPanel(trigger, panel) {
        const rect = trigger.getBoundingClientRect();
        panel.style.width = `${rect.width}px`;
        panel.style.left = `${rect.left}px`;
        const panelHeight = panel.offsetHeight || 180; 
        const spacingOffset = 8;
        panel.style.top = `${rect.top - panelHeight - spacingOffset}px`;
        panel.style.bottom = 'auto';
    }

    function dismissPortaledMenuPanel(panel) {
        const originalOwnerId = panel.dataset.ownerId;
        const targetContainer = document.getElementById(originalOwnerId);
        if (targetContainer) {
            targetContainer.appendChild(panel);
        }
    }

    document.querySelectorAll('.custom-dropdown-upward').forEach(dd => {
        const panel = dd.querySelector('.dropdown-menu-panel');
        if (panel) panel.dataset.ownerId = dd.id;
    });

    initializeUpwardDropdowns();

    // ==========================================================================
    // FIX: FORMATTING RESET AFTER PRESSING ENTER MANUALLY
    // ==========================================================================
    dom.textEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            document.execCommand('bold', false, null);
            document.execCommand('italic', false, null);
            document.execCommand('underline', false, null);
            document.execCommand('strikeThrough', false, null);
            document.execCommand('foreColor', false, '#1a1a1a');
            document.execCommand('fontSize', false, '4'); 

            const selection = window.getSelection();
            if (selection.rangeCount) {
                const range = selection.getRangeAt(0);
                const br = document.createElement('br');
                const textNode = document.createTextNode('\u200B'); 
                
                range.deleteContents();
                range.insertNode(textNode);
                range.insertNode(br);
                
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            synchronizeToolbarState();
            dom.textColorPicker.value = '#111111';
            syncCanvasBoundaries();
        }
    });

    // ==========================================================================
    // LOCAL STORAGE HANDLERS
    // ==========================================================================
    function getStoredNotebooksCollection() {
        const raw = localStorage.getItem('premium_notebook_database');
        return raw ? JSON.parse(raw) : [];
    }

    function saveNotebooksCollectionToStorage(arr) {
        localStorage.setItem('premium_notebook_database', JSON.stringify(arr));
    }

    // ==========================================================================
    // VIEW SWITCHBOARD MANAGER
    // ==========================================================================
    function renderDashboardView() {
        state.currentView = 'dashboard';
        dom.viewEditor.classList.add('hidden-element');
        dom.viewDashboard.classList.remove('hidden-element');
        buildDashboardNotesGrid();
    }

    function renderEditorWorkspace(noteId = null) {
        state.currentView = 'editor';
        state.activeEditingNoteId = noteId;
        
        dom.viewDashboard.classList.add('hidden-element');
        dom.viewEditor.classList.remove('hidden-element');
        
        dom.textEditor.innerHTML = '';
        state.drawing.history = [];
        state.drawing.redoStack = [];
        dom.objectLayer.innerHTML = '';
        
        if (noteId) {
            const db = getStoredNotebooksCollection();
            const note = db.find(n => n.id === noteId);
            if (note) {
                dom.editorTitleDisplay.textContent = note.title;
                dom.textEditor.innerHTML = note.textContent;
                state.drawing.history = note.drawingHistory || [];
                
                setDropdownSelectedValue('dropdown-paper-style', note.paperStyle || 'blank');
                setDropdownSelectedValue('dropdown-paper-color', note.paperTheme || 'cream');
                
                if (note.imagesDataTree) {
                    note.imagesDataTree.forEach(imgObj => rehydrateSavedImageNode(imgObj));
                }
            }
        } else {
            dom.editorTitleDisplay.textContent = 'Yeni Not';
            setDropdownSelectedValue('dropdown-paper-style', 'blank');
            setDropdownSelectedValue('dropdown-paper-color', 'cream');
            setDropdownSelectedValue('dropdown-font-size', '4'); 
        }
        
        updateNotebookPaperStyling();
        switchOperationalMode('text');
        setTimeout(syncCanvasBoundaries, 100);
    }

    function setDropdownSelectedValue(dropdownId, val) {
        const dd = document.getElementById(dropdownId);
        if (!dd) return;
        const panel = dd.querySelector('.dropdown-menu-panel') || document.querySelector(`body > .dropdown-menu-panel[data-owner-id="${dropdownId}"]`);
        const item = panel ? panel.querySelector(`.dropdown-item[data-value="${val}"]`) : dd.querySelector(`.dropdown-item[data-value="${val}"]`);
        
        if (item && panel) {
            panel.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('data-selected'));
            item.classList.add('data-selected');
            dd.querySelector('.dropdown-trigger-btn').textContent = item.textContent;
        }
    }

    // ==========================================================================
    // DASHBOARD VIEWS GENERATOR ENGINE
    // ==========================================================================
    function buildDashboardNotesGrid() {
        const notes = getStoredNotebooksCollection();
        dom.notesGrid.innerHTML = '';
        dom.notesCounter.textContent = `${notes.length} Not`;

        if (notes.length === 0) {
            dom.emptyState.classList.remove('hidden-element');
            return;
        }
        dom.emptyState.classList.add('hidden-element');

        notes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.dataset.id = note.id;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.textContent;
            const plainPreviewText = tempDiv.textContent || tempDiv.innerText || 'Ek içerik yok';

            card.innerHTML = `
                <button class="note-card-delete-trigger" title="Notu Sil">✕</button>
                <div style="flex-grow:1; display:flex; flex-direction:column; overflow:hidden;">
                    <h3 class="note-card-title">${note.title}</h3>
                    <div class="note-card-preview">${plainPreviewText}</div>
                </div>
                <div class="note-card-date">${note.modifiedAt}</div>
            `;

            card.addEventListener('click', async (e) => {
                if (e.target.classList.contains('note-card-delete-trigger')) {
                    e.stopPropagation();
                    const confirmClear = await openMobileModalFrame('confirm', 'Notu Sil', `"${note.title}" notunu silmek istediğinize emin misiniz?`);
                    if (confirmClear) {
                        let db = getStoredNotebooksCollection();
                        db = db.filter(n => n.id !== note.id);
                        saveNotebooksCollectionToStorage(db);
                        buildDashboardNotesGrid();
                    }
                    return;
                }
                renderEditorWorkspace(note.id);
            });

            dom.notesGrid.appendChild(card);
        });
    }

    // ==========================================================================
    // NOTE EDITOR LIFECYCLE SAVE TRANSACTIONS
    // ==========================================================================
    async function commitEditorStateToDatabase() {
        const defaultPromptVal = dom.editorTitleDisplay.textContent === 'Yeni Not' ? '' : dom.editorTitleDisplay.textContent;
        const inputTitle = await openMobileModalFrame('prompt', 'Notu Kaydet', 'Not başlığını girin:', defaultPromptVal);
        
        if (inputTitle === null) return; 
        
        const finalTitle = inputTitle.trim() === "" ? "Yeni Not" : inputTitle.trim();
        
        const imagesDataTree = [];
        dom.objectLayer.querySelectorAll('.image-wrapper-node').forEach(node => {
            const img = node.querySelector('img');
            imagesDataTree.push({
                src: img.src, top: node.style.top, left: node.style.left, width: node.style.width
            });
        });

        const dateString = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
        let db = getStoredNotebooksCollection();

        if (state.activeEditingNoteId) {
            db = db.map(note => {
                if (note.id === state.activeEditingNoteId) {
                    return {
                        ...note, title: finalTitle, textContent: dom.textEditor.innerHTML,
                        drawingHistory: state.drawing.history, imagesDataTree: imagesDataTree,
                        paperStyle: state.paperStyle, paperTheme: state.paperTheme, modifiedAt: dateString
                    };
                }
                return note;
            });
        } else {
            const newNote = {
                id: 'note_' + Date.now(), title: finalTitle, textContent: dom.textEditor.innerHTML,
                drawingHistory: state.drawing.history, imagesDataTree: imagesDataTree,
                paperStyle: state.paperStyle, paperTheme: state.paperTheme, modifiedAt: dateString
            };
            db.unshift(newNote);
        }

        saveNotebooksCollectionToStorage(db);
        await openMobileModalFrame('alert', 'Başarılı', 'Not başarıyla kaydedildi.');
        renderDashboardView();
    }

    // ==========================================================================
    // WORKSPACE SYSTEM ADJUSTMENT FRAMEWORK
    // ==========================================================================
    function syncCanvasBoundaries() {
        if (state.currentView !== 'editor') return;
        const dpr = window.devicePixelRatio || 1;
        const width = dom.container.clientWidth;
        const height = Math.max(dom.textEditor.scrollHeight, dom.container.clientHeight * 1.5);
        
        if (dom.canvas.width !== width * dpr || dom.canvas.height !== height * dpr) {
            dom.canvas.width = width * dpr;
            dom.canvas.height = height * dpr;
            dom.canvas.style.width = `${width}px`;
            dom.canvas.style.height = `${height}px`;
            
            ctx.resetTransform();
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            repaintVectorStrokeHistory();
        }
    }

    window.addEventListener('resize', syncCanvasBoundaries);
    setInterval(syncCanvasBoundaries, 1200);

    function dismissScrollHint() {
        if (dom.scrollHint && dom.scrollHint.classList.contains('scroll-hint-visible')) {
            dom.scrollHint.classList.remove('scroll-hint-visible');
            setTimeout(() => { if(dom.scrollHint) dom.scrollHint.style.display = 'none'; }, 400);
        }
    }

    document.querySelectorAll('.scrollable-toolbar-row').forEach(row => {
        row.addEventListener('scroll', dismissScrollHint, { passive: true });
        row.addEventListener('touchstart', dismissScrollHint, { passive: true });
    });

    // ==========================================================================
    // MODE ROUTER STRATEGY
    // ==========================================================================
    function switchOperationalMode(targetMode) {
        state.currentMode = targetMode;
        
        dom.modeText.classList.remove('active-mode');
        dom.modeDraw.classList.remove('active-mode');
        dom.modePage.classList.remove('active-mode');
        
        dom.barText.style.display = 'none';
        dom.barDraw.style.display = 'none';
        dom.barPage.style.display = 'none';
        
        dom.canvas.style.pointerEvents = 'none';
        dom.textEditor.setAttribute('contenteditable', 'false');
        clearActiveObjectSelection();

        if (targetMode === 'text') {
            dom.modeText.classList.add('active-mode');
            dom.barText.style.display = 'flex';
            dom.textEditor.setAttribute('contenteditable', 'true');
        } else if (targetMode === 'draw') {
            dom.modeDraw.classList.add('active-mode');
            dom.barDraw.style.display = 'flex';
            dom.canvas.style.pointerEvents = 'auto';
            if (document.activeElement) document.activeElement.blur();
        } else if (targetMode === 'page') {
            dom.modePage.classList.add('active-mode');
            dom.barPage.style.display = 'flex';
        }
        syncCanvasBoundaries();
    }

    dom.modeText.addEventListener('click', () => switchOperationalMode('text'));
    dom.modeDraw.addEventListener('click', () => switchOperationalMode('draw'));
    dom.modePage.addEventListener('click', () => switchOperationalMode('page'));
    dom.textEditor.addEventListener('input', syncCanvasBoundaries);

    // ==========================================================================
    // SELECTION TEXT SNIFFER SYSTEM & GESTURE SCROLL FILTER
    // ==========================================================================
    document.querySelectorAll('.tool-btn[data-command]').forEach(btn => {
        let touchStartX = 0;
        let touchStartY = 0;
        let isScrollingGesture = false;

        btn.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            isScrollingGesture = false;
        }, { passive: true });

        btn.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            if (Math.abs(touch.clientX - touchStartX) > 8 || Math.abs(touch.clientY - touchStartY) > 8) {
                isScrollingGesture = true;
            }
        }, { passive: true });

        btn.addEventListener('touchend', (e) => {
            if (!isScrollingGesture) {
                e.preventDefault(); 
                const command = btn.getAttribute('data-command');
                document.execCommand(command, false, null);
                synchronizeToolbarState();
                dom.textEditor.focus();
            }
        });

        btn.addEventListener('click', (e) => {
            if (isScrollingGesture) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const command = btn.getAttribute('data-command');
            document.execCommand(command, false, null);
            synchronizeToolbarState();
        });
    });

    dom.textColorPicker.addEventListener('input', () => {
        document.execCommand('foreColor', false, dom.textColorPicker.value);
    });

    function getSelectedStyleAttribute(styleProp, fallbackResolver) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return '';
        let node = selection.getRangeAt(0).commonAncestorContainer;
        if (node.nodeType === 3) node = node.parentNode;
        
        while (node && node !== dom.textEditor) {
            if (node.nodeType === 1) {
                const computed = window.getComputedStyle(node);
                if (styleProp === 'color' && node.hasAttribute('color')) return node.getAttribute('color');
                if (styleProp === 'size' && node.hasAttribute('size')) return node.getAttribute('size');
                if (computed[styleProp]) return computed[styleProp];
            }
            node = node.parentNode;
        }
        return fallbackResolver ? fallbackResolver() : '';
    }

    function synchronizeToolbarState() {
        if (state.currentMode !== 'text') return;

        dom.btnBold.classList.toggle('toggle-active', document.queryCommandState('bold'));
        dom.btnItalic.classList.toggle('toggle-active', document.queryCommandState('italic'));
        dom.btnUnderline.classList.toggle('toggle-active', document.queryCommandState('underline'));
        dom.btnStrike.classList.toggle('toggle-active', document.queryCommandState('strikeThrough'));
        dom.btnListBullet.classList.toggle('toggle-active', document.queryCommandState('insertUnorderedList'));
        dom.btnListOrdered.classList.toggle('toggle-active', document.queryCommandState('insertOrderedList'));
        
        dom.btnLeft.classList.toggle('toggle-active', document.queryCommandState('justifyLeft'));
        dom.btnCenter.classList.toggle('toggle-active', document.queryCommandState('justifyCenter'));
        dom.btnRight.classList.toggle('toggle-active', document.queryCommandState('justifyRight'));

        const sizeAttr = getSelectedStyleAttribute('size', () => document.queryCommandValue('fontSize'));
        if (sizeAttr) setDropdownSelectedValue('dropdown-font-size', sizeAttr);

        const rgbColor = getSelectedStyleAttribute('color', () => document.queryCommandValue('foreColor'));
        if (rgbColor && rgbColor.includes('rgb')) {
            const matches = rgbColor.match(/\d+/g);
            if (matches && matches.length >= 3) {
                const hex = "#" + matches.slice(0, 3).map(x => parseInt(x, 10).toString(16).padStart(2, '0')).join('');
                dom.textColorPicker.value = hex;
            }
        }
    }

    document.addEventListener('selectionchange', synchronizeToolbarState);
    dom.textEditor.addEventListener('keyup', synchronizeToolbarState);

    // ==========================================================================
    // SMOOTH VECTOR LINE GRAPHICS DRAWER ENGINE
    // ==========================================================================
    let activeStrokePoints = [];
    let isDrawingLive = false;
    let needsRepaint = false;
    
    function getTouchDocumentCoordinates(e) {
        if (!e.touches || e.touches.length === 0) return null;
        const touch = e.touches[0];
        const rect = dom.canvas.getBoundingClientRect();
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    function executionRenderLoop() {
        if (!isDrawingLive) return;
        if (needsRepaint && activeStrokePoints.length > 0) {
            repaintVectorStrokeHistory();
            
            ctx.beginPath();
            ctx.strokeStyle = state.drawing.isPen ? state.drawing.color : '#000000';
            ctx.lineWidth = state.drawing.weight;
            ctx.globalCompositeOperation = state.drawing.isPen ? 'source-over' : 'destination-out';
            
            ctx.moveTo(activeStrokePoints[0].x, activeStrokePoints[0].y);
            if (activeStrokePoints.length === 1) {
                ctx.lineTo(activeStrokePoints[0].x, activeStrokePoints[0].y);
            } else {
                for (let i = 1; i < activeStrokePoints.length - 1; i++) {
                    const xc = (activeStrokePoints[i].x + activeStrokePoints[i + 1].x) / 2;
                    const yc = (activeStrokePoints[i].y + activeStrokePoints[i + 1].y) / 2;
                    ctx.quadraticCurveTo(activeStrokePoints[i].x, activeStrokePoints[i].y, xc, yc);
                }
                ctx.lineTo(activeStrokePoints[activeStrokePoints.length - 1].x, activeStrokePoints[activeStrokePoints.length - 1].y);
            }
            ctx.stroke();
            needsRepaint = false;
        }
        requestAnimationFrame(executionRenderLoop);
    }

    dom.canvas.addEventListener('touchstart', (e) => {
        if (state.currentMode !== 'draw') return;
        e.preventDefault();
        const coords = getTouchDocumentCoordinates(e);
        if (!coords) return;
        isDrawingLive = true;
        activeStrokePoints = [coords];
        needsRepaint = true;
        requestAnimationFrame(executionRenderLoop);
    }, { passive: false });

    dom.canvas.addEventListener('touchmove', (e) => {
        if (!isDrawingLive) return;
        e.preventDefault();
        const coords = getTouchDocumentCoordinates(e);
        if (!coords) return;
        const lastPoint = activeStrokePoints[activeStrokePoints.length - 1];
        const distance = Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y);
        if (distance > 1.5) {
            activeStrokePoints.push(coords);
            needsRepaint = true;
        }
    }, { passive: false });

    dom.canvas.addEventListener('touchend', (e) => {
        if (!isDrawingLive) return;
        e.preventDefault();
        isDrawingLive = false;
        if (activeStrokePoints.length > 0) {
            state.drawing.history.push({
                mode: state.drawing.isPen ? 'pen' : 'eraser', color: state.drawing.color,
                weight: state.drawing.weight, points: [...activeStrokePoints]
            });
            state.drawing.redoStack = []; 
        }
        activeStrokePoints = [];
        repaintVectorStrokeHistory();
    }, { passive: false });

    function repaintVectorStrokeHistory() {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, dom.canvas.width / dpr, dom.canvas.height / dpr);

        state.drawing.history.forEach(stroke => {
            if (stroke.points.length < 1) return;
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.weight;
            ctx.globalCompositeOperation = stroke.mode === 'pen' ? 'source-over' : 'destination-out';

            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            if (stroke.points.length === 1) {
                ctx.lineTo(stroke.points[0].x, stroke.points[0].y);
            } else {
                for (let i = 1; i < stroke.points.length - 1; i++) {
                    const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
                    const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
                    ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
                }
                ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
            }
            ctx.stroke();
        });
        ctx.globalCompositeOperation = state.drawing.isPen ? 'source-over' : 'destination-out';
    }

    dom.btnDrawPen.addEventListener('click', () => { state.drawing.isPen = true; dom.btnDrawPen.classList.add('toggle-active'); dom.btnDrawEraser.classList.remove('toggle-active'); });
    dom.btnDrawEraser.addEventListener('click', () => { state.drawing.isPen = false; dom.btnDrawEraser.classList.add('toggle-active'); dom.btnDrawPen.classList.remove('toggle-active'); });
    dom.btnDrawClear.addEventListener('click', () => { state.drawing.history = []; state.drawing.redoStack = []; repaintVectorStrokeHistory(); });
    dom.penColorPicker.addEventListener('input', () => { state.drawing.color = dom.penColorPicker.value; dom.btnDrawPen.click(); });
    dom.penWeight.addEventListener('input', () => { state.drawing.weight = parseInt(dom.penWeight.value, 10); });

    // ==========================================================================
    // INTERACTIVE GESTURE OBJECTS COMPONENT ARRAYS
    // ==========================================================================
    dom.btnInsertImage.addEventListener('click', () => dom.imageLoader.click());

    dom.imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => createNewInteractiveImageNode(event.target.result);
        reader.readAsDataURL(file);
        dom.imageLoader.value = "";
    });

    function createNewInteractiveImageNode(srcData) {
        const imgObj = { src: srcData, top: `${dom.container.scrollTop + 80}px`, left: `40px`, width: `220px` };
        const wrapper = rehydrateSavedImageNode(imgObj);
        setSelectedObjectNode(wrapper);
        syncCanvasBoundaries();
    }

    function rehydrateSavedImageNode(imgObj) {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper-node';
        wrapper.style.top = imgObj.top; wrapper.style.left = imgObj.left; wrapper.style.width = imgObj.width;

        const img = document.createElement('img');
        img.src = imgObj.src;
        wrapper.appendChild(img);

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'node-control-anchor anchor-br';
        const deleteHandle = document.createElement('div');
        deleteHandle.className = 'node-control-anchor anchor-del';
        deleteHandle.innerHTML = '✕';

        wrapper.appendChild(resizeHandle);
        wrapper.appendChild(deleteHandle);
        dom.objectLayer.appendChild(wrapper);

        setupObjectNodeInteractionGestures(wrapper, resizeHandle, deleteHandle);
        return wrapper;
    }

    function setSelectedObjectNode(node) {
        clearActiveObjectSelection();
        state.activeSelectedNode = node;
        node.classList.add('selected-node');
    }

    function clearActiveObjectSelection() {
        if (state.activeSelectedNode) {
            state.activeSelectedNode.classList.remove('selected-node');
            state.activeSelectedNode = null;
        }
    }

    function setupObjectNodeInteractionGestures(wrapper, resizer, deleter) {
        let isDragging = false;
        let isResizing = false;
        let startX, startY, startLeft, startTop, startWidth;

        wrapper.addEventListener('touchstart', (e) => {
            if (e.target === deleter) {
                e.preventDefault();
                wrapper.remove();
                clearActiveObjectSelection();
                syncCanvasBoundaries();
                return;
            }
            setSelectedObjectNode(wrapper);
            const touch = e.touches[0];
            startX = touch.clientX; startY = touch.clientY;

            if (e.target === resizer) {
                isResizing = true;
                startWidth = wrapper.offsetWidth;
            } else {
                isDragging = true;
                startLeft = parseInt(wrapper.style.left, 10) || 0;
                startTop = parseInt(wrapper.style.top, 10) || 0;
            }
            e.stopPropagation();
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging && !isResizing) return;
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;

            if (isDragging) {
                const deltaY = touch.clientY - startY;
                wrapper.style.left = `${startLeft + deltaX}px`;
                wrapper.style.top = `${startTop + deltaY}px`;
            }
            if (isResizing) {
                const targetWidth = startWidth + deltaX;
                if (targetWidth > 50) wrapper.style.width = `${targetWidth}px`;
            }
        }, { passive: false });

        window.addEventListener('touchend', () => {
            if (isDragging || isResizing) {
                isDragging = false; isResizing = false;
                syncCanvasBoundaries();
            }
        });
    }

    dom.container.addEventListener('touchstart', (e) => {
        if (!e.target.closest('.image-wrapper-node') && !e.target.closest('#mobile-toolbar-wrapper')) {
            clearActiveObjectSelection();
        }
    });

    // ==========================================================================
    // RELIABLE EXCLUSIVE SELECTION & REAL-TIME PAGE RENDERING UPDATER
    // ==========================================================================
    function updateNotebookPaperStyling() {
        const stylePanel = document.getElementById('dropdown-paper-style-panel') || document.querySelector('body > #dropdown-paper-style-panel');
        const colorPanel = document.getElementById('dropdown-paper-color-panel') || document.querySelector('body > #dropdown-paper-color-panel');
        
        const selectedStyleItem = stylePanel ? stylePanel.querySelector('.dropdown-item.data-selected') : null;
        const selectedColorItem = colorPanel ? colorPanel.querySelector('.dropdown-item.data-selected') : null;

        state.paperStyle = selectedStyleItem ? selectedStyleItem.dataset.value : 'blank';
        state.paperTheme = selectedColorItem ? selectedColorItem.dataset.value : 'cream';

        dom.container.className = '';
        dom.container.classList.add(`paper-${state.paperStyle}`, `theme-${state.paperTheme}`);
    }

    // ==========================================================================
    // NATIVE KEYBOARD ATTACHMENT POSITIONER (VISUAL VIEWPORT ENGINE)
    // ==========================================================================
    if (window.visualViewport) {
        const handleVisualViewportChange = () => {
            const toolbarWrapper = document.getElementById('mobile-toolbar-wrapper');
            if (!toolbarWrapper || state.currentView !== 'editor') return;

            const keyboardOffsetHeight = window.innerHeight - window.visualViewport.height;

            if (keyboardOffsetHeight > 40) {
                toolbarWrapper.style.position = 'fixed';
                toolbarWrapper.style.bottom = `${keyboardOffsetHeight}px`;
            } else {
                toolbarWrapper.style.position = 'fixed';
                toolbarWrapper.style.bottom = '0px';
            }
        };

        window.visualViewport.addEventListener('resize', handleVisualViewportChange);
        window.visualViewport.addEventListener('scroll', handleVisualViewportChange);
    }

    // ==========================================================================
    // NAVIGATION LINK EXECUTIONS
    // ==========================================================================
    dom.fabCreate.addEventListener('click', () => renderEditorWorkspace(null));
    
    dom.btnBack.addEventListener('click', async () => {
        const confirmExit = await openMobileModalFrame('confirm', 'Değişiklikleri Geri Al', "Ana ekrana dönmek istiyor musunuz? Kaydedilmemiş değişiklikler kaybolacaktır.");
        if (confirmExit) renderDashboardView();
    });
    
    dom.btnSave.addEventListener('click', commitEditorStateToDatabase);

    dom.btnUndo.addEventListener('click', () => {
        if (state.currentMode === 'draw') {
            if (state.drawing.history.length > 0) {
                state.drawing.redoStack.push(state.drawing.history.pop());
                repaintVectorStrokeHistory();
            }
        } else {
            document.execCommand('undo', false, null);
            synchronizeToolbarState();
        }
    });

    dom.btnRedo.addEventListener('click', () => {
        if (state.currentMode === 'draw') {
            if (state.drawing.redoStack.length > 0) {
                state.drawing.history.push(state.drawing.redoStack.pop());
                repaintVectorStrokeHistory();
            }
        } else {
            document.execCommand('redo', false, null);
            synchronizeToolbarState();
        }
    });

    // ==========================================================================
    // SENKRONİZE KOYU MOD / AÇIK MOD VE GEÇİŞ SİSTEMİ
    // ==========================================================================
    const globalThemeBtn = document.getElementById('btn-theme-toggle');
    const editorThemeBtn = document.getElementById('btn-editor-theme-toggle');

    function applySynchronizedTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if(globalThemeBtn) globalThemeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            if(editorThemeBtn) editorThemeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.documentElement.removeAttribute('data-theme');
            if(globalThemeBtn) globalThemeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            if(editorThemeBtn) editorThemeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    function toggleThemeSharedLogic() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applySynchronizedTheme(newTheme);
    }

    if (globalThemeBtn) globalThemeBtn.addEventListener('click', toggleThemeSharedLogic);
    if (editorThemeBtn) editorThemeBtn.addEventListener('click', toggleThemeSharedLogic);

    const savedTheme = localStorage.getItem('theme') || 'light';
    applySynchronizedTheme(savedTheme);

    window.addEventListener('storage', (e) => {
        if (e.key === 'theme') {
            applySynchronizedTheme(e.newValue);
        }
    });

    document.getElementById('btn-global-back')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.add('fade-out');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 200);
    });

    // Boot Initialization Call
    renderDashboardView();
});
