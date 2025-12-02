// Simple auth helper to call backend login/signup endpoints

// Detect if the page is opened from the filesystem (file://). Browsers treat that origin as 'null'
// which causes CORS to block requests to http(s) endpoints when using relative URLs.
// If we're on file://, prefix API calls with the backend origin (default localhost:3000).
const baseApi = (typeof location !== 'undefined' && location.protocol === 'file:') ? 'http://localhost:3000' : '';

async function postJson(url, data) {
    try {
        const fullUrl = (url.startsWith('http://') || url.startsWith('https://')) ? url : (baseApi + url);
        if (baseApi) console.debug('Using baseApi', baseApi, 'for', url);

        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        return { ok: res.ok, status: res.status, json };
    } catch (err) {
        return { ok: false, status: 0, json: { error: err.message } };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = prompt('Email:');
            const password = prompt('Password:');
            if (!email || !password) return alert('Email and password required.');

            const result = await postJson('/api/login', { email, password });
            if (result.ok && result.json && result.json.success) {
                localStorage.setItem('dku_user_id', result.json.user_id);
                alert('Login successful. User ID: ' + result.json.user_id);
            } else {
                const msg = result.json && (result.json.message || result.json.error) ? (result.json.message || result.json.error) : 'Login failed';
                alert('Login failed: ' + msg);
            }
        });
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', async () => {
            const type = prompt('Sign up as (attendee / club / school / student):');
            if (!type) return;
            const t = type.toLowerCase().trim();

            try {
                if (t === 'attendee') {
                    const email = prompt('Email:');
                    const password = prompt('Password:');
                    const first_name = prompt('First name:');
                    const last_name = prompt('Last name:');
                    const netId = prompt('NetID:');
                    const res = await postJson('/api/signup/attendee', { email, password, first_name, last_name, netId });
                    alert(res.json && (res.json.message || res.json.error) ? (res.json.message || res.json.error) : 'No response');
                } else if (t === 'club') {
                    const email = prompt('Club admin email:');
                    const password = prompt('Password:');
                    const club_name = prompt('Club name:');
                    const club_url = prompt('Club URL:');
                    const contact_email = prompt('Contact email:');
                    const res = await postJson('/api/signup/club', { email, password, club_name, club_url, contact_email });
                    alert(res.json && (res.json.message || res.json.error) ? (res.json.message || res.json.error) : 'No response');
                } else if (t === 'school') {
                    const email = prompt('School admin email:');
                    const password = prompt('Password:');
                    const department = prompt('Department:');
                    const name = prompt('School name:');
                    const supervisor = prompt('Supervisor name:');
                    const res = await postJson('/api/signup/school', { email, password, department, name, supervisor });
                    alert(res.json && (res.json.message || res.json.error) ? (res.json.message || res.json.error) : 'No response');
                } else if (t === 'student') {
                    const email = prompt('Email:');
                    const password = prompt('Password:');
                    const first_name = prompt('First name:');
                    const last_name = prompt('Last name:');
                    const netId = prompt('NetID:');
                    const res = await postJson('/api/signup/student', { email, password, first_name, last_name, netId });
                    alert(res.json && (res.json.message || res.json.error) ? (res.json.message || res.json.error) : 'No response');
                } else {
                    alert('Unknown signup type: ' + t);
                }
            } catch (err) {
                alert('Signup failed: ' + err.message);
            }
        });
    }
});
