/**
 * Fediverse OAuth Module
 * Supports Mastodon (OAuth 2.0) and Misskey (MiAuth)
 */

const STORAGE_KEY = 'inyong_accounts';
const APP_NAME = '인용 이미지 생성기';
const APP_WEBSITE = location.origin;

// Storage helpers
function getAccounts() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveAccounts(accounts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function addAccount(account) {
    const accounts = getAccounts();
    // Remove existing account for same instance
    const filtered = accounts.filter(a => a.instance !== account.instance);
    filtered.push(account);
    saveAccounts(filtered);
}

function removeAccount(instance) {
    const accounts = getAccounts().filter(a => a.instance !== instance);
    saveAccounts(accounts);
}

function getAccount(instance) {
    return getAccounts().find(a => a.instance === instance);
}

// Detect server type
async function detectServerType(instance) {
    const baseUrl = `https://${instance}`;

    // Try Misskey first (check for /api/meta)
    try {
        const res = await fetch(`${baseUrl}/api/meta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        if (res.ok) {
            const data = await res.json();
            if (data.version || data.name) {
                return 'misskey';
            }
        }
    } catch {}

    // Try Mastodon (check for /api/v1/instance or /api/v2/instance)
    try {
        const res = await fetch(`${baseUrl}/api/v2/instance`);
        if (res.ok) return 'mastodon';
    } catch {}

    try {
        const res = await fetch(`${baseUrl}/api/v1/instance`);
        if (res.ok) return 'mastodon';
    } catch {}

    throw new Error('서버 유형을 감지할 수 없습니다. 올바른 인스턴스 주소인지 확인하세요.');
}

// ============ Mastodon OAuth ============

async function mastodonRegisterApp(instance) {
    const baseUrl = `https://${instance}`;
    const redirectUri = `${location.origin}${location.pathname}`;

    const res = await fetch(`${baseUrl}/api/v1/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_name: APP_NAME,
            redirect_uris: redirectUri,
            scopes: 'read write:media write:statuses',
            website: APP_WEBSITE
        })
    });

    if (!res.ok) {
        throw new Error('앱 등록에 실패했습니다');
    }

    return await res.json();
}

async function mastodonStartAuth(instance) {
    const app = await mastodonRegisterApp(instance);
    const redirectUri = `${location.origin}${location.pathname}`;

    // Store app info for later
    sessionStorage.setItem('oauth_pending', JSON.stringify({
        type: 'mastodon',
        instance,
        clientId: app.client_id,
        clientSecret: app.client_secret,
        redirectUri
    }));

    // Redirect to authorization
    const authUrl = new URL(`https://${instance}/oauth/authorize`);
    authUrl.searchParams.set('client_id', app.client_id);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'read write:media write:statuses');

    location.href = authUrl.toString();
}

async function mastodonCompleteAuth(code) {
    const pending = JSON.parse(sessionStorage.getItem('oauth_pending'));
    if (!pending || pending.type !== 'mastodon') {
        throw new Error('인증 세션을 찾을 수 없습니다');
    }

    const res = await fetch(`https://${pending.instance}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: pending.clientId,
            client_secret: pending.clientSecret,
            redirect_uri: pending.redirectUri,
            grant_type: 'authorization_code',
            code,
            scope: 'read write:media write:statuses'
        })
    });

    if (!res.ok) {
        throw new Error('토큰 교환에 실패했습니다');
    }

    const token = await res.json();

    // Get account info
    const accountRes = await fetch(`https://${pending.instance}/api/v1/accounts/verify_credentials`, {
        headers: { 'Authorization': `Bearer ${token.access_token}` }
    });

    const accountInfo = await accountRes.json();

    addAccount({
        type: 'mastodon',
        instance: pending.instance,
        accessToken: token.access_token,
        username: accountInfo.username,
        displayName: accountInfo.display_name || accountInfo.username,
        avatar: accountInfo.avatar
    });

    sessionStorage.removeItem('oauth_pending');

    return pending.instance;
}

async function mastodonPost(instance, imageBlob, text, visibility = 'public', altText = '') {
    const account = getAccount(instance);
    if (!account) throw new Error('계정을 찾을 수 없습니다');

    const baseUrl = `https://${instance}`;
    const headers = { 'Authorization': `Bearer ${account.accessToken}` };

    // Upload media
    const formData = new FormData();
    formData.append('file', imageBlob, 'quote.png');
    if (altText) {
        formData.append('description', altText);
    }

    const mediaRes = await fetch(`${baseUrl}/api/v2/media`, {
        method: 'POST',
        headers,
        body: formData
    });

    if (!mediaRes.ok) {
        // Fallback to v1
        const formDataV1 = new FormData();
        formDataV1.append('file', imageBlob, 'quote.png');
        if (altText) {
            formDataV1.append('description', altText);
        }
        const mediaResV1 = await fetch(`${baseUrl}/api/v1/media`, {
            method: 'POST',
            headers,
            body: formDataV1
        });
        if (!mediaResV1.ok) throw new Error('이미지 업로드에 실패했습니다');
        var media = await mediaResV1.json();
    } else {
        var media = await mediaRes.json();
    }

    // Wait for media processing if needed
    if (media.url === null) {
        // Poll for processing completion
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const checkRes = await fetch(`${baseUrl}/api/v1/media/${media.id}`, { headers });
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.url) break;
            }
        }
    }

    // Create status
    const statusRes = await fetch(`${baseUrl}/api/v1/statuses`, {
        method: 'POST',
        headers: {
            ...headers,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: text,
            media_ids: [media.id],
            visibility
        })
    });

    if (!statusRes.ok) throw new Error('게시에 실패했습니다');

    return await statusRes.json();
}

// ============ Misskey MiAuth ============

function generateMiAuthSession() {
    return crypto.randomUUID();
}

async function misskeyStartAuth(instance) {
    const session = generateMiAuthSession();
    const callbackUrl = `${location.origin}${location.pathname}`;

    sessionStorage.setItem('oauth_pending', JSON.stringify({
        type: 'misskey',
        instance,
        session
    }));

    const authUrl = new URL(`https://${instance}/miauth/${session}`);
    authUrl.searchParams.set('name', APP_NAME);
    authUrl.searchParams.set('callback', callbackUrl);
    authUrl.searchParams.set('permission', 'read:account,write:notes,write:drive');

    location.href = authUrl.toString();
}

async function misskeyCompleteAuth(session) {
    const pending = JSON.parse(sessionStorage.getItem('oauth_pending'));
    if (!pending || pending.type !== 'misskey') {
        throw new Error('인증 세션을 찾을 수 없습니다');
    }

    const res = await fetch(`https://${pending.instance}/api/miauth/${session}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });

    if (!res.ok) {
        throw new Error('인증 확인에 실패했습니다');
    }

    const data = await res.json();

    if (!data.ok || !data.token) {
        throw new Error('인증이 거부되었습니다');
    }

    addAccount({
        type: 'misskey',
        instance: pending.instance,
        accessToken: data.token,
        username: data.user.username,
        displayName: data.user.name || data.user.username,
        avatar: data.user.avatarUrl
    });

    sessionStorage.removeItem('oauth_pending');

    return pending.instance;
}

async function misskeyPost(instance, imageBlob, text, visibility = 'public', altText = '') {
    const account = getAccount(instance);
    if (!account) throw new Error('계정을 찾을 수 없습니다');

    const baseUrl = `https://${instance}`;

    // Upload file to drive
    const formData = new FormData();
    formData.append('i', account.accessToken);
    formData.append('file', imageBlob, 'quote.png');
    formData.append('name', `quote-${Date.now()}.png`);
    if (altText) {
        formData.append('comment', altText);
    }

    const driveRes = await fetch(`${baseUrl}/api/drive/files/create`, {
        method: 'POST',
        body: formData
    });

    if (!driveRes.ok) throw new Error('이미지 업로드에 실패했습니다');

    const file = await driveRes.json();

    // Map visibility
    const visibilityMap = {
        'public': 'public',
        'unlisted': 'home',
        'private': 'followers',
        'direct': 'specified'
    };

    // Create note
    const noteRes = await fetch(`${baseUrl}/api/notes/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            i: account.accessToken,
            text: text || null,
            fileIds: [file.id],
            visibility: visibilityMap[visibility] || 'public'
        })
    });

    if (!noteRes.ok) throw new Error('게시에 실패했습니다');

    const result = await noteRes.json();
    return result.createdNote;
}

// ============ Unified API ============

async function startAuth(instance) {
    // Clean instance URL
    instance = instance.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const serverType = await detectServerType(instance);

    if (serverType === 'misskey') {
        await misskeyStartAuth(instance);
    } else {
        await mastodonStartAuth(instance);
    }
}

async function handleAuthCallback() {
    const url = new URL(location.href);

    // Check for Mastodon callback (has 'code' param)
    const code = url.searchParams.get('code');
    if (code) {
        const instance = await mastodonCompleteAuth(code);
        // Clean URL
        history.replaceState({}, '', location.pathname);
        return { success: true, instance };
    }

    // Check for Misskey callback (has 'session' param)
    const session = url.searchParams.get('session');
    if (session) {
        const instance = await misskeyCompleteAuth(session);
        // Clean URL
        history.replaceState({}, '', location.pathname);
        return { success: true, instance };
    }

    return { success: false };
}

async function postToFediverse(instance, imageBlob, text, visibility, altText = '') {
    const account = getAccount(instance);
    if (!account) throw new Error('계정을 찾을 수 없습니다');

    if (account.type === 'misskey') {
        return await misskeyPost(instance, imageBlob, text, visibility, altText);
    } else {
        return await mastodonPost(instance, imageBlob, text, visibility, altText);
    }
}

// Export to global
window.FediAuth = {
    getAccounts,
    getAccount,
    addAccount,
    removeAccount,
    startAuth,
    handleAuthCallback,
    postToFediverse,
    detectServerType
};
