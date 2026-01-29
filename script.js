// DOM Elements
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');

const quoteText = document.getElementById('quote-text');
const sourceText = document.getElementById('source-text');
const authorText = document.getElementById('author-text');

const bgType = document.getElementById('bg-type');
const gradientDirection = document.getElementById('gradient-direction');
const bgColor1 = document.getElementById('bg-color1');
const bgColor2 = document.getElementById('bg-color2');
const textColor = document.getElementById('text-color');

const fontFamily = document.getElementById('font-family');
const fontSize = document.getElementById('font-size');
const fontSizeValue = document.getElementById('font-size-value');
const canvasSize = document.getElementById('canvas-size');
const padding = document.getElementById('padding');
const paddingValue = document.getElementById('padding-value');

const alignBtns = document.querySelectorAll('.align-btn');
const showQuotemark = document.getElementById('show-quotemark');
const presetBtns = document.querySelectorAll('.preset-btn');

const customFontInput = document.getElementById('custom-font');
const customFontNameDisplay = document.getElementById('custom-font-name');
const bgImageInput = document.getElementById('bg-image');
const bgImageNameDisplay = document.getElementById('bg-image-name');
const bgImageGroup = document.getElementById('bg-image-group');
const bgOverlayOpacity = document.getElementById('bg-overlay-opacity');
const bgOverlayOpacityValue = document.getElementById('bg-overlay-opacity-value');

const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');

// State
let textAlign = 'center';
let customFontName = null;
let backgroundImage = null;

// Presets
const presets = {
    dark: {
        bgType: 'gradient',
        gradientDirection: 'to bottom right',
        bgColor1: '#1a1a2e',
        bgColor2: '#16213e',
        textColor: '#ffffff'
    },
    light: {
        bgType: 'gradient',
        gradientDirection: 'to bottom right',
        bgColor1: '#f8f9fa',
        bgColor2: '#e9ecef',
        textColor: '#212529'
    },
    sunset: {
        bgType: 'gradient',
        gradientDirection: 'to bottom right',
        bgColor1: '#f97316',
        bgColor2: '#ec4899',
        textColor: '#ffffff'
    },
    ocean: {
        bgType: 'gradient',
        gradientDirection: 'to bottom right',
        bgColor1: '#0ea5e9',
        bgColor2: '#6366f1',
        textColor: '#ffffff'
    },
    forest: {
        bgType: 'gradient',
        gradientDirection: 'to bottom right',
        bgColor1: '#059669',
        bgColor2: '#14b8a6',
        textColor: '#ffffff'
    },
    wine: {
        bgType: 'gradient',
        gradientDirection: 'to bottom right',
        bgColor1: '#7c2d12',
        bgColor2: '#be185d',
        textColor: '#ffffff'
    }
};

// Initialize
function init() {
    setupEventListeners();
    render();
}

function setupEventListeners() {
    // Text inputs
    quoteText.addEventListener('input', render);
    sourceText.addEventListener('input', render);
    authorText.addEventListener('input', render);

    // Style inputs
    bgType.addEventListener('change', () => {
        const isGradient = bgType.value === 'gradient';
        const isImage = bgType.value === 'image';
        gradientDirection.closest('.form-group').style.display = isGradient ? 'block' : 'none';
        bgImageGroup.style.display = isImage ? 'block' : 'none';
        render();
    });

    // Background image upload
    bgImageInput.addEventListener('change', handleBgImageUpload);
    bgOverlayOpacity.addEventListener('input', () => {
        bgOverlayOpacityValue.textContent = bgOverlayOpacity.value + '%';
        render();
    });

    // Custom font upload
    customFontInput.addEventListener('change', handleCustomFontUpload);
    gradientDirection.addEventListener('change', render);
    bgColor1.addEventListener('input', render);
    bgColor2.addEventListener('input', render);
    textColor.addEventListener('input', render);

    fontFamily.addEventListener('change', render);
    fontSize.addEventListener('input', () => {
        fontSizeValue.textContent = fontSize.value + 'px';
        render();
    });
    canvasSize.addEventListener('change', render);
    padding.addEventListener('input', () => {
        paddingValue.textContent = padding.value + 'px';
        render();
    });

    // Align buttons
    alignBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alignBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            textAlign = btn.dataset.align;
            render();
        });
    });

    showQuotemark.addEventListener('change', render);

    // Preset buttons
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            applyPreset(btn.dataset.preset);
        });
    });

    // Action buttons
    downloadBtn.addEventListener('click', downloadImage);
    copyBtn.addEventListener('click', copyToClipboard);
}

function applyPreset(presetName) {
    const preset = presets[presetName];
    if (!preset) return;

    bgType.value = preset.bgType;
    gradientDirection.value = preset.gradientDirection;
    bgColor1.value = preset.bgColor1;
    bgColor2.value = preset.bgColor2;
    textColor.value = preset.textColor;

    gradientDirection.closest('.form-group').style.display =
        preset.bgType === 'gradient' ? 'block' : 'none';
    bgImageGroup.style.display = 'none';

    render();
}

// Custom font upload handler
async function handleCustomFontUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const fontName = 'CustomFont-' + Date.now();
        const arrayBuffer = await file.arrayBuffer();
        const font = new FontFace(fontName, arrayBuffer);

        await font.load();
        document.fonts.add(font);

        customFontName = fontName;

        // Add to font select if not already there
        let customOption = fontFamily.querySelector('option[data-custom="true"]');
        if (customOption) {
            customOption.value = fontName;
            customOption.textContent = file.name.replace(/\.[^.]+$/, '');
        } else {
            customOption = document.createElement('option');
            customOption.value = fontName;
            customOption.textContent = file.name.replace(/\.[^.]+$/, '');
            customOption.dataset.custom = 'true';
            fontFamily.appendChild(customOption);
        }

        fontFamily.value = fontName;
        customFontNameDisplay.textContent = file.name;
        customFontNameDisplay.classList.add('has-file');

        render();
    } catch (err) {
        console.error('Failed to load font:', err);
        alert('폰트 로드에 실패했습니다. 유효한 폰트 파일인지 확인하세요.');
    }
}

// Background image upload handler
function handleBgImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            backgroundImage = img;
            bgImageNameDisplay.textContent = file.name;
            bgImageNameDisplay.classList.add('has-file');
            render();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function getCanvasDimensions() {
    const [width, height] = canvasSize.value.split('x').map(Number);
    return { width, height };
}

function render() {
    const { width, height } = getCanvasDimensions();
    canvas.width = width;
    canvas.height = height;

    // Draw background
    drawBackground(width, height);

    // Draw text
    drawQuote(width, height);
}

function drawBackground(width, height) {
    if (bgType.value === 'solid') {
        ctx.fillStyle = bgColor1.value;
        ctx.fillRect(0, 0, width, height);
    } else if (bgType.value === 'image' && backgroundImage) {
        // Draw image with cover-like behavior
        const imgRatio = backgroundImage.width / backgroundImage.height;
        const canvasRatio = width / height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > canvasRatio) {
            // Image is wider - fit height
            drawHeight = height;
            drawWidth = height * imgRatio;
            offsetX = (width - drawWidth) / 2;
            offsetY = 0;
        } else {
            // Image is taller - fit width
            drawWidth = width;
            drawHeight = width / imgRatio;
            offsetX = 0;
            offsetY = (height - drawHeight) / 2;
        }

        ctx.drawImage(backgroundImage, offsetX, offsetY, drawWidth, drawHeight);

        // Draw overlay
        const opacity = parseInt(bgOverlayOpacity.value) / 100;
        if (opacity > 0) {
            ctx.fillStyle = bgColor1.value;
            ctx.globalAlpha = opacity;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1;
        }
    } else if (bgType.value === 'image') {
        // No image uploaded yet, show placeholder
        ctx.fillStyle = bgColor1.value;
        ctx.fillRect(0, 0, width, height);
    } else {
        let gradient;
        const dir = gradientDirection.value;

        if (dir === 'radial') {
            gradient = ctx.createRadialGradient(
                width / 2, height / 2, 0,
                width / 2, height / 2, Math.max(width, height) / 1.5
            );
        } else {
            let x0 = 0, y0 = 0, x1 = 0, y1 = 0;

            if (dir.includes('right')) x1 = width;
            if (dir.includes('bottom')) y1 = height;
            if (dir === 'to right') { x1 = width; y1 = 0; }
            if (dir === 'to bottom') { x1 = 0; y1 = height; }

            gradient = ctx.createLinearGradient(x0, y0, x1, y1);
        }

        gradient.addColorStop(0, bgColor1.value);
        gradient.addColorStop(1, bgColor2.value);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
}

function wrapText(text, maxWidth, font) {
    ctx.font = font;
    const words = text.split('');
    const lines = [];
    let currentLine = '';

    // Handle Korean text (character-based wrapping)
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = char;
        } else {
            currentLine = testLine;
        }

        // Handle newlines
        if (char === '\n') {
            lines.push(currentLine.slice(0, -1));
            currentLine = '';
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

function drawTextJustified(text, x, y, maxWidth, isLastLine = false) {
    // For last line or short lines, use left align
    const textWidth = ctx.measureText(text).width;
    if (isLastLine || textWidth < maxWidth * 0.75) {
        ctx.textAlign = 'left';
        ctx.fillText(text, x, y);
        return;
    }

    // Calculate spacing between characters for justify
    const chars = text.split('');
    const totalCharWidth = chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0);
    const extraSpace = maxWidth - totalCharWidth;
    const spaceBetween = extraSpace / (chars.length - 1);

    let currentX = x;
    chars.forEach(char => {
        ctx.textAlign = 'left';
        ctx.fillText(char, currentX, y);
        currentX += ctx.measureText(char).width + spaceBetween;
    });
}

function drawQuote(width, height) {
    const pad = parseInt(padding.value);
    const maxWidth = width - pad * 2;
    const quoteFontSize = parseInt(fontSize.value);
    const quoteFont = `${quoteFontSize}px "${fontFamily.value}"`;
    const metaFontSize = Math.max(16, quoteFontSize * 0.5);
    const metaFont = `${metaFontSize}px "${fontFamily.value}"`;

    ctx.fillStyle = textColor.value;

    // Calculate text position based on alignment
    let x;
    if (textAlign === 'left' || textAlign === 'justify') {
        x = pad;
    } else if (textAlign === 'right') {
        x = width - pad;
    } else {
        x = width / 2;
    }

    // Prepare quote text with optional quotation marks
    let displayQuote = quoteText.value;
    if (showQuotemark.checked && displayQuote.trim()) {
        displayQuote = `“${displayQuote}”`;
    }

    // Wrap and measure all text
    const quoteLines = wrapText(displayQuote, maxWidth, quoteFont);
    const lineHeight = quoteFontSize * 1.5;
    const quoteHeight = quoteLines.length * lineHeight;

    // Build source/author line
    let metaLine = '';
    if (sourceText.value.trim() && authorText.value.trim()) {
        metaLine = `— ${authorText.value}, 《${sourceText.value}》`;
    } else if (sourceText.value.trim()) {
        metaLine = `— 《${sourceText.value}》`;
    } else if (authorText.value.trim()) {
        metaLine = `— ${authorText.value}`;
    }

    const metaHeight = metaLine ? metaFontSize * 2 : 0;
    const totalHeight = quoteHeight + metaHeight;

    // Start Y position (centered vertically)
    let y = (height - totalHeight) / 2 + quoteFontSize;

    // Draw quote lines
    ctx.font = quoteFont;
    quoteLines.forEach((line, index) => {
        const isLastLine = index === quoteLines.length - 1;

        if (textAlign === 'justify') {
            drawTextJustified(line, x, y, maxWidth, isLastLine);
        } else {
            ctx.textAlign = textAlign;
            ctx.fillText(line, x, y);
        }
        y += lineHeight;
    });

    // Draw meta line (always use current textAlign, not justify)
    if (metaLine) {
        ctx.font = metaFont;
        ctx.globalAlpha = 0.8;
        ctx.textAlign = textAlign === 'justify' ? 'left' : textAlign;
        ctx.fillText(metaLine, x, y + metaFontSize * 0.5);
        ctx.globalAlpha = 1;
    }
}

// Generate alt text for accessibility
function generateAltText() {
    const quote = quoteText.value.trim();
    const source = sourceText.value.trim();
    const author = authorText.value.trim();

    if (!quote) return '';

    let altText = `인용문: "${quote}"`;

    if (author && source) {
        altText += ` - ${author}, 《${source}》`;
    } else if (author) {
        altText += ` - ${author}`;
    } else if (source) {
        altText += ` - 《${source}》`;
    }

    return altText;
}

function downloadImage() {
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `quote-${timestamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

async function copyToClipboard() {
    try {
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });

        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        // Show success feedback
        copyBtn.textContent = '복사됨!';
        copyBtn.classList.add('success');
        setTimeout(() => {
            copyBtn.textContent = '클립보드에 복사';
            copyBtn.classList.remove('success');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('클립보드 복사에 실패했습니다. 브라우저가 이 기능을 지원하지 않을 수 있습니다.');
    }
}

// ============ Share Functionality ============

const accountsList = document.getElementById('accounts-list');
const addAccountBtn = document.getElementById('add-account-btn');
const addAccountModal = document.getElementById('add-account-modal');
const shareModal = document.getElementById('share-modal');
const instanceInput = document.getElementById('instance-input');
const startAuthBtn = document.getElementById('start-auth-btn');
const authError = document.getElementById('auth-error');
const shareAccountInfo = document.getElementById('share-account-info');
const shareAltText = document.getElementById('share-alt-text');
const shareText = document.getElementById('share-text');
const shareVisibility = document.getElementById('share-visibility');
const shareError = document.getElementById('share-error');
const shareSuccess = document.getElementById('share-success');
const doShareBtn = document.getElementById('do-share-btn');

let currentShareInstance = null;

function setupShareListeners() {
    // Add account button
    addAccountBtn.addEventListener('click', () => openModal('add-account-modal'));

    // Start auth button
    startAuthBtn.addEventListener('click', handleStartAuth);

    // Enter key on instance input
    instanceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleStartAuth();
    });

    // Share button
    doShareBtn.addEventListener('click', handleShare);

    // Modal close buttons
    document.querySelectorAll('.modal-close, .modal-footer .secondary-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            if (modalId) closeModal(modalId);
        });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');

    // Reset form state
    if (modalId === 'add-account-modal') {
        instanceInput.value = '';
        authError.classList.remove('visible');
        authError.textContent = '';
    }
    if (modalId === 'share-modal') {
        shareAltText.value = '';
        shareText.value = '';
        shareError.classList.remove('visible');
        shareSuccess.classList.remove('visible');
        doShareBtn.classList.remove('loading');
        doShareBtn.disabled = false;
    }
}

function renderAccounts() {
    const accounts = FediAuth.getAccounts();

    if (accounts.length === 0) {
        accountsList.innerHTML = '<p class="no-accounts">계정을 추가하면 여기에 표시됩니다</p>';
        return;
    }

    accountsList.innerHTML = accounts.map(account => `
        <div class="account-item" data-instance="${account.instance}">
            <img class="account-avatar" src="${account.avatar || ''}" alt=""
                 onerror="this.style.display='none'">
            <div class="account-info">
                <div class="account-name">${escapeHtml(account.displayName)}</div>
                <div class="account-instance">@${escapeHtml(account.username)}@${escapeHtml(account.instance)}</div>
            </div>
            <div class="account-actions">
                <button class="share-btn" data-instance="${account.instance}">공유</button>
                <button class="remove-btn" data-instance="${account.instance}" title="계정 제거">&times;</button>
            </div>
        </div>
    `).join('');

    // Add event listeners
    accountsList.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => openShareModal(btn.dataset.instance));
    });

    accountsList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('이 계정을 제거하시겠습니까?')) {
                FediAuth.removeAccount(btn.dataset.instance);
                renderAccounts();
            }
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function handleStartAuth() {
    const instance = instanceInput.value.trim();

    if (!instance) {
        showAuthError('인스턴스 주소를 입력하세요');
        return;
    }

    authError.classList.remove('visible');
    startAuthBtn.classList.add('loading');
    startAuthBtn.disabled = true;

    try {
        await FediAuth.startAuth(instance);
        // Will redirect to auth page
    } catch (err) {
        showAuthError(err.message || '인증 시작에 실패했습니다');
        startAuthBtn.classList.remove('loading');
        startAuthBtn.disabled = false;
    }
}

function showAuthError(message) {
    authError.textContent = message;
    authError.classList.add('visible');
}

function openShareModal(instance) {
    const account = FediAuth.getAccount(instance);
    if (!account) return;

    currentShareInstance = instance;

    shareAccountInfo.innerHTML = `
        <img class="account-avatar" src="${account.avatar || ''}" alt=""
             onerror="this.style.display='none'">
        <div class="account-info">
            <div class="account-name">${escapeHtml(account.displayName)}</div>
            <div class="account-instance">@${escapeHtml(account.username)}@${escapeHtml(account.instance)}</div>
        </div>
    `;

    shareError.classList.remove('visible');
    shareSuccess.classList.remove('visible');

    // Auto-generate alt text
    shareAltText.value = generateAltText();

    openModal('share-modal');
}

async function handleShare() {
    if (!currentShareInstance) return;

    shareError.classList.remove('visible');
    shareSuccess.classList.remove('visible');
    doShareBtn.classList.add('loading');
    doShareBtn.disabled = true;

    try {
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });

        const result = await FediAuth.postToFediverse(
            currentShareInstance,
            blob,
            shareText.value.trim(),
            shareVisibility.value,
            shareAltText.value.trim()
        );

        // Show success
        shareSuccess.textContent = '공유되었습니다!';
        shareSuccess.classList.add('visible');
        doShareBtn.textContent = '완료!';

        // Close modal after delay
        setTimeout(() => {
            closeModal('share-modal');
            doShareBtn.textContent = '공유';
            doShareBtn.classList.remove('loading');
            doShareBtn.disabled = false;
        }, 1500);

    } catch (err) {
        console.error('Share failed:', err);
        shareError.textContent = err.message || '공유에 실패했습니다';
        shareError.classList.add('visible');
        doShareBtn.classList.remove('loading');
        doShareBtn.disabled = false;
    }
}

async function handleAuthCallback() {
    try {
        const result = await FediAuth.handleAuthCallback();
        if (result.success) {
            renderAccounts();
            // Show notification
            const account = FediAuth.getAccount(result.instance);
            if (account) {
                alert(`${account.displayName}(@${account.username}@${account.instance}) 계정이 추가되었습니다!`);
            }
        }
    } catch (err) {
        console.error('Auth callback failed:', err);
        alert('인증에 실패했습니다: ' + err.message);
    }
}

// Start
document.fonts.ready.then(() => {
    init();
    setupShareListeners();
    renderAccounts();
    handleAuthCallback();
});
