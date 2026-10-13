/**
 * AI Virtual Try-On Platform - App Logic & API Integration
 */

const API_BASE = (window.location.origin.includes(':8000') || window.location.port === '8000') 
    ? '' 
    : 'http://localhost:8000';

// App State
const state = {
    catalog: { models: [], garments: [] },
    selectedModelType: 'sample', // 'sample' | 'upload'
    selectedModelSample: 'anh2.png',
    selectedModelFile: null,
    
    selectedGarmentType: 'sample', // 'sample' | 'upload'
    selectedGarmentSample: 'vay1.png',
    selectedGarmentFile: null,

    // Advanced options
    turbo: false,
    prompt: '',
    outputFormat: 'jpg',
    outputQuality: 95,
    preserveInputSize: true,

    // Execution state
    isGenerating: false,
    generationResult: null,
    generationError: null,
    statusMessage: ''
};

// Fetch initial catalog from API
async function fetchCatalog() {
    try {
        const res = await fetch(`${API_BASE}/api/catalog`);
        if (res.ok) {
            const data = await res.json();
            state.catalog = data;
            if (data.models && data.models.length > 0 && !state.selectedModelSample) {
                state.selectedModelSample = data.models[0].id;
            }
            if (data.garments && data.garments.length > 0 && !state.selectedGarmentSample) {
                state.selectedGarmentSample = data.garments[0].id;
            }
        }
    } catch (e) {
        console.warn("Could not connect to backend API /api/catalog:", e);
    }
}

// Router Implementation
const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

const router = async () => {
    const routes = [
        { path: "/", view: homeView },
        { path: "/ai-demo", view: demoView },
        { path: "/product-catalog", view: catalogView },
        { path: "/pricing", view: pricingView },
        { path: "/business-dashboard", view: dashboardView },
        { path: "/business-dashboard/statistics-&-reports", view: () => dashboardLayout('Statistics & Reports') },
        { path: "/business-dashboard/user-management", view: () => dashboardLayout('User Management') },
        { path: "/business-dashboard/api-key-management", view: () => dashboardLayout('API Keys') },
        { path: "/business-dashboard/billing", view: () => dashboardLayout('Billing') },
        { path: "/login", view: () => simplePageView('Login to TryOn.ai', 'Welcome back! Please login to your account.') },
        { path: "/sign-up", view: () => simplePageView('Create an Account', 'Join TryOn.ai and start your virtual try-on journey.') },
        { path: "/404-error", view: () => simplePageView('404 - Not Found', 'The page you are looking for does not exist.') }
    ];

    const potentialMatches = routes.map(route => {
        return {
            route: route,
            isMatch: location.pathname === route.path
        };
    });

    let match = potentialMatches.find(potentialMatch => potentialMatch.isMatch);

    const otherValidRoutes = [
        "/end-user-flow", "/contact-sales", "/contact-us",
        "/frequently-asked-questions", "/blog", "/api-documentation",
        "/features", "/about-us", "/cookies"
    ];

    if (!match && otherValidRoutes.includes(location.pathname)) {
        const title = location.pathname.substring(1).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        match = {
            route: { path: location.pathname, view: () => simplePageView(title, `This is information about the ${title} page.`) }
        };
    } else if (!match) {
        match = {
            route: routes.find(r => r.path === "/404-error")
        };
    }

    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === location.pathname) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    const appRoot = document.getElementById("app-root");
    const htmlContent = await match.route.view();
    appRoot.innerHTML = htmlContent;

    attachViewListeners();
};

window.addEventListener("popstate", router);

document.addEventListener("DOMContentLoaded", async () => {
    await fetchCatalog();
    checkApiHealth();

    document.body.addEventListener("click", e => {
        if (e.target.matches("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        } else if (e.target.closest("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.closest("[data-link]").href);
        }
    });

    router();
});

// Health indicator in navbar
async function checkApiHealth() {
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        if (res.ok) {
            const brandEl = document.querySelector('.nav-brand');
            if (brandEl && !brandEl.querySelector('.badge-online')) {
                const badge = document.createElement('span');
                badge.className = 'badge badge-online';
                badge.innerHTML = '● API Online';
                brandEl.appendChild(badge);
            }
        }
    } catch (e) {
        console.log("Backend offline or running on another port.");
    }
}

// Attach interactive listeners for active DOM elements
function attachViewListeners() {
    document.querySelectorAll('[data-model-sample]').forEach(el => {
        el.addEventListener('click', () => {
            state.selectedModelType = 'sample';
            state.selectedModelSample = el.getAttribute('data-model-sample');
            state.selectedModelFile = null;
            router();
        });
    });

    document.querySelectorAll('[data-garment-sample]').forEach(el => {
        el.addEventListener('click', () => {
            state.selectedGarmentType = 'sample';
            state.selectedGarmentSample = el.getAttribute('data-garment-sample');
            state.selectedGarmentFile = null;
            router();
        });
    });

    const modelFileInput = document.getElementById('model-file-input');
    if (modelFileInput) {
        modelFileInput.addEventListener('change', e => {
            if (e.target.files && e.target.files[0]) {
                state.selectedModelType = 'upload';
                state.selectedModelFile = e.target.files[0];
                router();
            }
        });
    }

    const garmentFileInput = document.getElementById('garment-file-input');
    if (garmentFileInput) {
        garmentFileInput.addEventListener('change', e => {
            if (e.target.files && e.target.files[0]) {
                state.selectedGarmentType = 'upload';
                state.selectedGarmentFile = e.target.files[0];
                router();
            }
        });
    }

    const runBtn = document.getElementById('btn-run-tryon');
    if (runBtn) {
        runBtn.addEventListener('click', handleRunTryOn);
    }
}

// Trigger Virtual Try-On API Request
async function handleRunTryOn() {
    if (state.isGenerating) return;

    state.isGenerating = true;
    state.generationResult = null;
    state.generationError = null;
    state.statusMessage = 'Initializing request...';
    await router();

    const formData = new FormData();

    if (state.selectedModelType === 'upload' && state.selectedModelFile) {
        formData.append('person_file', state.selectedModelFile);
    } else {
        formData.append('person_sample', state.selectedModelSample || 'anh2.png');
    }

    if (state.selectedGarmentType === 'upload' && state.selectedGarmentFile) {
        formData.append('garment_files', state.selectedGarmentFile);
    } else {
        formData.append('garment_samples', state.selectedGarmentSample || 'vay1.png');
    }

    const turboEl = document.getElementById('opt-turbo');
    const formatEl = document.getElementById('opt-format');
    const qualityEl = document.getElementById('opt-quality');

    formData.append('turbo', turboEl ? turboEl.checked : false);
    formData.append('output_format', formatEl ? formatEl.value : 'jpg');
    formData.append('output_quality', qualityEl ? qualityEl.value : 95);
    formData.append('preserve_input_size', true);

    state.statusMessage = 'Processing with Replicate GPU model...';
    await router();

    try {
        const response = await fetch(`${API_BASE}/api/try-on`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            state.generationResult = data;
            state.statusMessage = `Generation completed in ${data.processing_time}!`;
        } else {
            state.generationError = data.error || data.message || "Failed to generate try-on.";
            if (data.fallback_url) {
                state.generationResult = {
                    output_url: data.fallback_url,
                    processing_time: 'fallback preview',
                    id: data.id || '#TR-DEMO'
                };
            }
        }
    } catch (err) {
        console.error(err);
        state.generationError = "Unable to connect to Python backend server. Make sure FastAPI server is running on port 8000.";
    } finally {
        state.isGenerating = false;
        await router();
    }
}

// --- Page Views ---

function homeView() {
    return `
        <div class="hero">
            <h1>Transform E-commerce with <br><span class="highlight">AI Virtual Try-On</span></h1>
            <p>Empower your fashion business with seamless API integration. Let your customers "try before they buy" virtually, reducing returns and increasing conversions.</p>
            <div class="nav-actions" style="justify-content: center; margin-top: 2rem;">
                <a href="/ai-demo" class="btn btn-primary" data-link>Try Interactive Demo</a>
                <a href="/product-catalog" class="btn btn-ghost" data-link>Browse Garments Catalog</a>
            </div>
        </div>

        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">✨</div>
                <h3>Hyper-Realistic Fitting</h3>
                <p>Powered by modern generative diffusion models that preserve garment texture, pattern, and natural drape on any model.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🔌</div>
                <h3>Python FastAPI Backend</h3>
                <p>Fully connected REST API endpoint wrapping Replicate's high-speed GPU inference engine for real-time try-on outputs.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">📈</div>
                <h3>Business Dashboard</h3>
                <p>Track request volume, processing latency, success rate metrics, and manage API tokens with live telemetry logs.</p>
            </div>
        </div>
    `;
}

function demoView() {
    let modelImgSrc = `${API_BASE}/static/images/Person_image/${state.selectedModelSample}`;
    if (state.selectedModelType === 'upload' && state.selectedModelFile) {
        modelImgSrc = URL.createObjectURL(state.selectedModelFile);
    }

    let garmentImgSrc = `${API_BASE}/static/images/Garment_image/${state.selectedGarmentSample}`;
    if (state.selectedGarmentType === 'upload' && state.selectedGarmentFile) {
        garmentImgSrc = URL.createObjectURL(state.selectedGarmentFile);
    }

    const modelsList = state.catalog.models && state.catalog.models.length > 0 ? state.catalog.models : [
        { id: 'anh2.png', name: 'Model 1', url: `${API_BASE}/static/images/Person_image/anh2.png` },
        { id: 'pic1.png', name: 'Model 2', url: `${API_BASE}/static/images/Person_image/pic1.png` }
    ];

    const garmentsList = state.catalog.garments && state.catalog.garments.length > 0 ? state.catalog.garments : [
        { id: 'vay1.png', name: 'Summer Dress', url: `${API_BASE}/static/images/Garment_image/vay1.png` },
        { id: 'ao1.png', name: 'Classic Shirt', url: `${API_BASE}/static/images/Garment_image/ao1.png` },
        { id: 'quan1.png', name: 'Trousers', url: `${API_BASE}/static/images/Garment_image/quan1.png` }
    ];

    return `
        <div class="view-container">
            <h1><span class="highlight">Interactive AI Virtual Try-On Studio</span></h1>
            <p>Select or upload a model photo and a garment to test live AI fitting results in real-time.</p>

            <div class="demo-layout">
                <!-- MODEL SELECTOR CARD -->
                <div class="selector-card">
                    <div class="selector-header">
                        <span class="selector-title">👤 1. Model Photo</span>
                        <div class="tab-buttons">
                            <button class="tab-btn ${state.selectedModelType === 'sample' ? 'active' : ''}" onclick="state.selectedModelType='sample'; router();">Samples</button>
                            <button class="tab-btn ${state.selectedModelType === 'upload' ? 'active' : ''}" onclick="state.selectedModelType='upload'; router();">Upload</button>
                        </div>
                    </div>

                    ${state.selectedModelType === 'sample' ? `
                        <div class="sample-grid">
                            ${modelsList.map(m => `
                                <div class="sample-item ${state.selectedModelSample === m.id ? 'selected' : ''}" data-model-sample="${m.id}">
                                    <img src="${m.url}" alt="${m.name}">
                                    <div class="sample-name">${m.name}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        ${state.selectedModelFile ? `
                            <div class="preview-container">
                                <img src="${modelImgSrc}" alt="Uploaded Model">
                                <button class="remove-btn" onclick="state.selectedModelFile=null; state.selectedModelType='sample'; router();">✕</button>
                            </div>
                        ` : `
                            <div class="upload-zone" onclick="document.getElementById('model-file-input').click()">
                                <div style="font-size: 2rem; margin-bottom: 0.5rem">📸</div>
                                <div style="font-weight: 600;">Click to upload model photo</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary)">PNG, JPG or WEBP (Max 10MB)</div>
                                <input type="file" id="model-file-input" accept="image/*">
                            </div>
                        `}
                    `}
                </div>

                <!-- GARMENT SELECTOR CARD -->
                <div class="selector-card">
                    <div class="selector-header">
                        <span class="selector-title">👗 2. Garment Selection</span>
                        <div class="tab-buttons">
                            <button class="tab-btn ${state.selectedGarmentType === 'sample' ? 'active' : ''}" onclick="state.selectedGarmentType='sample'; router();">Catalog</button>
                            <button class="tab-btn ${state.selectedGarmentType === 'upload' ? 'active' : ''}" onclick="state.selectedGarmentType='upload'; router();">Upload</button>
                        </div>
                    </div>

                    ${state.selectedGarmentType === 'sample' ? `
                        <div class="sample-grid">
                            ${garmentsList.map(g => `
                                <div class="sample-item ${state.selectedGarmentSample === g.id ? 'selected' : ''}" data-garment-sample="${g.id}">
                                    <img src="${g.url}" alt="${g.name}">
                                    <div class="sample-name">${g.name}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        ${state.selectedGarmentFile ? `
                            <div class="preview-container">
                                <img src="${garmentImgSrc}" alt="Uploaded Garment">
                                <button class="remove-btn" onclick="state.selectedGarmentFile=null; state.selectedGarmentType='sample'; router();">✕</button>
                            </div>
                        ` : `
                            <div class="upload-zone" onclick="document.getElementById('garment-file-input').click()">
                                <div style="font-size: 2rem; margin-bottom: 0.5rem">👕</div>
                                <div style="font-weight: 600;">Click to upload garment photo</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary)">Isolated garment image recommended</div>
                                <input type="file" id="garment-file-input" accept="image/*">
                            </div>
                        `}
                    `}
                </div>
            </div>

            <!-- OPTIONS PANEL -->
            <div class="options-panel">
                <h3 style="margin-bottom: 0.5rem; font-size: 1.1rem;">⚡ API Generation Options</h3>
                <div class="options-grid">
                    <div class="toggle-container">
                        <span>Turbo Mode (Faster execution)</span>
                        <label class="switch">
                            <input type="checkbox" id="opt-turbo" ${state.turbo ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="font-size: 0.9rem;">Output Format</label>
                        <select id="opt-format" class="form-input" style="padding: 0.4rem 0.8rem;">
                            <option value="jpg" ${state.outputFormat === 'jpg' ? 'selected' : ''}>JPG (High Compatibility)</option>
                            <option value="png" ${state.outputFormat === 'png' ? 'selected' : ''}>PNG (Lossless)</option>
                            <option value="webp" ${state.outputFormat === 'webp' ? 'selected' : ''}>WEBP (Web Optimized)</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="font-size: 0.9rem;">Quality Level (95)</label>
                        <input type="range" id="opt-quality" min="50" max="100" value="95" style="width: 100%;">
                    </div>
                </div>
            </div>

            <!-- ACTION BUTTON -->
            <div style="text-align: center; margin: 2rem 0;">
                <button id="btn-run-tryon" class="btn btn-primary" style="font-size: 1.2rem; padding: 1rem 3.5rem;" ${state.isGenerating ? 'disabled' : ''}>
                    ${state.isGenerating ? `⚡ Processing AI Try-On...` : `✨ Generate Virtual Try-On`}
                </button>
            </div>

            <!-- LOADING INDICATOR -->
            ${state.isGenerating ? `
                <div style="margin: 2rem 0; padding: 2rem; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
                    <div class="spinner"></div>
                    <div style="font-size: 1.1rem; font-weight: 600; color: var(--accent-primary)">Running AI Try-On Model...</div>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem; color: var(--text-secondary)">${state.statusMessage || 'Processing on Replicate GPU cluster...'}</p>
                </div>
            ` : ''}

            <!-- ERROR ALERT IF ANY -->
            ${state.generationError ? `
                <div style="margin: 1.5rem 0; padding: 1rem 1.5rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; color: #f87171; text-align: left;">
                    <strong>⚠️ Notice:</strong> ${state.generationError}
                </div>
            ` : ''}

            <!-- RESULT SECTION -->
            ${state.generationResult ? `
                <div class="result-card">
                    <div class="result-header">
                        <h3>🎉 Virtual Try-On Result</h3>
                        <div>
                            <span class="badge badge-success">Status: ${state.generationResult.processing_time}</span>
                            <a href="${API_BASE}${state.generationResult.output_url}" download="tryon-result.jpg" target="_blank" class="btn btn-ghost" style="padding: 0.4rem 1rem; margin-left: 0.5rem; font-size: 0.9rem;">⬇ Download Image</a>
                        </div>
                    </div>

                    <div class="result-comparison">
                        <div class="result-img-box">
                            <div style="padding: 0.5rem; background: rgba(0,0,0,0.5); font-weight: 600; text-align: center; font-size: 0.85rem;">Input Model</div>
                            <img src="${modelImgSrc}" alt="Input Model">
                        </div>

                        <div style="font-size: 2rem; color: var(--accent-primary)">➔</div>

                        <div class="result-img-box" style="border-color: var(--accent-primary); box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);">
                            <div style="padding: 0.5rem; background: var(--accent-gradient); color: white; font-weight: 600; text-align: center; font-size: 0.85rem;">AI Generated Result</div>
                            <img src="${API_BASE}${state.generationResult.output_url}" alt="AI Try-on Output">
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function catalogView() {
    const garmentsList = state.catalog.garments && state.catalog.garments.length > 0 ? state.catalog.garments : [
        { id: 'vay1.png', name: 'Floral Summer Dress', category: 'Dress', price: '$89.00', url: `${API_BASE}/static/images/Garment_image/vay1.png` },
        { id: 'ao1.png', name: 'Classic White Shirt', category: 'Top', price: '$49.00', url: `${API_BASE}/static/images/Garment_image/ao1.png` },
        { id: 'quan1.png', name: 'Tailored Trousers', category: 'Pants', price: '$69.00', url: `${API_BASE}/static/images/Garment_image/quan1.png` }
    ];

    return `
        <div class="view-container">
            <h1>Garment <span class="highlight">Catalog</span></h1>
            <p>Select any item to test virtual fitting in our AI Studio.</p>

            <div class="catalog-grid">
                ${garmentsList.map(g => `
                    <div class="catalog-card">
                        <img src="${g.url}" alt="${g.name}" class="catalog-card-img">
                        <div class="catalog-card-body">
                            <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary)">${g.category || 'Apparel'}</span>
                            <div class="catalog-card-title">${g.name}</div>
                            <div class="catalog-card-price">${g.price || '$59.00'}</div>
                            <button class="btn btn-primary" style="width: 100%; margin-top: auto;" onclick="
                                state.selectedGarmentType='sample';
                                state.selectedGarmentSample='${g.id}';
                                navigateTo('/ai-demo');
                            ">✨ Try On This Item</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function pricingView() {
    return `
        <div class="view-container">
            <h1>Simple, <span class="highlight">Transparent Pricing</span></h1>
            <p>Scale your business with plans designed for growth.</p>

            <div class="features-grid" style="margin-top: 2rem;">
                <div class="feature-card" style="text-align: left;">
                    <h3>Starter</h3>
                    <div style="font-size: 2.5rem; font-weight: 700; margin: 1rem 0;">$49<span style="font-size: 1rem; color: var(--text-secondary)">/mo</span></div>
                    <p>Perfect for local brands just starting out.</p>
                    <ul style="list-style: none; padding: 0; margin-bottom: 2rem; color: var(--text-secondary);">
                        <li style="margin-bottom: 0.5rem;">✓ 1,000 API Calls / month</li>
                        <li style="margin-bottom: 0.5rem;">✓ Standard Resolution</li>
                        <li style="margin-bottom: 0.5rem;">✓ Email Support</li>
                    </ul>
                    <a href="/sign-up" class="btn btn-ghost" style="width: 100%;" data-link>Get Started</a>
                </div>

                <div class="feature-card" style="text-align: left; border-color: var(--accent-primary); transform: scale(1.05); position: relative;">
                    <div style="position: absolute; top: -12px; right: 24px; background: var(--accent-gradient); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">RECOMMENDED</div>
                    <h3>Pro</h3>
                    <div style="font-size: 2.5rem; font-weight: 700; margin: 1rem 0;">$199<span style="font-size: 1rem; color: var(--text-secondary)">/mo</span></div>
                    <p>For growing e-commerce platforms.</p>
                    <ul style="list-style: none; padding: 0; margin-bottom: 2rem; color: var(--text-secondary);">
                        <li style="margin-bottom: 0.5rem;">✓ 10,000 API Calls / month</li>
                        <li style="margin-bottom: 0.5rem;">✓ High Resolution Generation</li>
                        <li style="margin-bottom: 0.5rem;">✓ Priority Support</li>
                        <li style="margin-bottom: 0.5rem;">✓ Custom Watermark</li>
                    </ul>
                    <a href="/sign-up" class="btn btn-primary" style="width: 100%;" data-link>Get Started</a>
                </div>

                <div class="feature-card" style="text-align: left;">
                    <h3>Enterprise</h3>
                    <div style="font-size: 2.5rem; font-weight: 700; margin: 1rem 0;">Custom</div>
                    <p>For large scale operations and high volumes.</p>
                    <ul style="list-style: none; padding: 0; margin-bottom: 2rem; color: var(--text-secondary);">
                        <li style="margin-bottom: 0.5rem;">✓ Unlimited API Calls</li>
                        <li style="margin-bottom: 0.5rem;">✓ 4K Resolution</li>
                        <li style="margin-bottom: 0.5rem;">✓ 24/7 Phone Support</li>
                        <li style="margin-bottom: 0.5rem;">✓ Dedicated Account Manager</li>
                    </ul>
                    <a href="/contact-sales" class="btn btn-ghost" style="width: 100%;" data-link>Contact Sales</a>
                </div>
            </div>
        </div>
    `;
}

async function fetchDashboardHistory() {
    try {
        const res = await fetch(`${API_BASE}/api/history`);
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.warn("Could not fetch history log", e);
    }
    return { total_calls: 4289, success_rate: "98.4%", avg_time: "1.5s", logs: [] };
}

async function dashboardLayout(contentTitle) {
    const activePath = location.pathname;
    const historyData = await fetchDashboardHistory();
    const logs = historyData.logs || [];

    return `
        <div class="dashboard-layout">
            <aside class="dashboard-sidebar">
                <div class="sidebar-nav">
                    <a href="/business-dashboard" class="sidebar-link ${activePath === '/business-dashboard' ? 'active' : ''}" data-link>Overview</a>
                    <a href="/business-dashboard/statistics-&-reports" class="sidebar-link ${activePath === '/business-dashboard/statistics-&-reports' ? 'active' : ''}" data-link>Statistics & Reports</a>
                    <a href="/business-dashboard/user-management" class="sidebar-link ${activePath === '/business-dashboard/user-management' ? 'active' : ''}" data-link>User Management</a>
                    <a href="/business-dashboard/api-key-management" class="sidebar-link ${activePath === '/business-dashboard/api-key-management' ? 'active' : ''}" data-link>API Keys</a>
                    <a href="/business-dashboard/billing" class="sidebar-link ${activePath === '/business-dashboard/billing' ? 'active' : ''}" data-link>Billing</a>
                </div>
            </aside>
            <main class="dashboard-content">
                <div class="dashboard-header">
                    <h2>${contentTitle || 'Dashboard Overview'}</h2>
                    <button class="btn btn-primary">+ Create New Key</button>
                </div>

                ${contentTitle ? `<p>Content for ${contentTitle} goes here...</p>` : `
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-title">API Calls (This Month)</div>
                        <div class="metric-value">${historyData.total_calls}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Success Rate</div>
                        <div class="metric-value highlight">${historyData.success_rate}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Avg Latency</div>
                        <div class="metric-value">${historyData.avg_time}</div>
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Recent Try-On API Telemetry Logs</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Timestamp</th>
                                <th>Status</th>
                                <th>Model / Inputs</th>
                                <th>Processing Time</th>
                                <th>Output</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.length > 0 ? logs.map(row => `
                                <tr>
                                    <td style="font-weight: 600;">${row.id}</td>
                                    <td>${row.timestamp}</td>
                                    <td><span class="badge ${row.status === 'Success' ? 'badge-success' : 'badge-error'}">${row.status}</span></td>
                                    <td style="font-size: 0.85rem; color: var(--text-secondary)">Model: ${row.person} | Garment: ${row.garment}</td>
                                    <td>${row.processing_time}</td>
                                    <td><a href="${API_BASE}${row.output_url}" target="_blank" class="highlight" style="font-size: 0.85rem;">View Image</a></td>
                                </tr>
                            `).join('') : `
                                <tr><td colspan="6" style="text-align: center; color: var(--text-secondary)">No recent API logs recorded.</td></tr>
                            `}
                        </tbody>
                    </table>
                </div>
                `}
            </main>
        </div>
    `;
}

function dashboardView() {
    return dashboardLayout(null);
}

function simplePageView(title, description) {
    return `
        <div class="view-container">
            <h2>${title}</h2>
            <p>${description}</p>
            ${title === 'Login to TryOn.ai' || title === 'Create an Account' ? `
                <div style="max-width: 400px; margin: 2rem auto; background: var(--bg-card); padding: 2rem; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" class="form-input" placeholder="you@company.com">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-input" placeholder="••••••••">
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;">${title === 'Login to TryOn.ai' ? 'Sign In' : 'Create Account'}</button>
                </div>
            ` : ''}
        </div>
    `;
}
