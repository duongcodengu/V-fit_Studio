/**
 * V-Fit Studio - AI Virtual Try-On Platform (B2C Edition)
 * Kết nối:
 * - Frontend Cloudflare: https://v-fit-studio.vfit.workers.dev/
 * - Backend Render: https://v-fit-studio.onrender.com/
 */

// =========================================================================
// 1. CẤU HÌNH KẾT NỐI BACKEND (API CONFIG)
// Khi chạy ở máy tính local -> http://localhost:8000
// Khi chạy trên Cloudflare Workers -> https://v-fit-studio.onrender.com
// =========================================================================
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? (window.location.port === '8000' ? '' : 'http://localhost:8000')
    : 'https://v-fit-studio.onrender.com';

// =========================================================================
// 2. CẤU HÌNH TÀI KHOẢN THANH TOÁN (PAYMENT CONFIG)
// 👉 Bạn có thể dễ dàng thay đổi số tài khoản hoặc tên ngân hàng của bạn ở đây:
// =========================================================================
const PAYMENT_CONFIG = {
    bankId: 'MB',                          // Mã ngân hàng VietQR: MB, VCB, TCB, ACB, VPB, ICB...
    bankName: 'MB Bank (Ngân hàng Quân Đội)', // Tên ngân hàng hiển thị
    accountNumber: '1230124092003',           // 👈 [SỐ TÀI KHOẢN]
    accountName: 'Ngô Vũ Dương',           // 👈 [TÊN CHỦ TÀI KHOẢN]
    transferPrefix: 'VFIT',                // Cú pháp nội dung: VFIT + Mã đơn
    qrImage: 'money.png'                   // 👈 Sử dụng file ảnh QR money.png
};

// =========================================================================
// =========================================================================
// 3. CÁC GÓI DỊCH VỤ DÀNH CHO KHÁCH HÀNG CÁ NHÂN (B2C PRICING)
// =========================================================================
const PRICING_PLANS = [
    {
        id: 'free',
        name: 'Dùng thử miễn phí (Free Trial)',
        badge: 'Trải Nghiệm 🎁',
        price: 0,
        priceDisplay: '0 VNĐ',
        period: '/3 lần thử',
        credits: 3,
        desc: 'Thu hút người dùng mới',
        features: [
            '3 lần thử đồ AI hoàn toàn miễn phí',
            'Trải nghiệm trọn vẹn công nghệ AI Virtual Try-On',
            'Áp dụng cho mọi trang phục & người mẫu',
            'Tải ảnh kết quả về máy chất lượng cao'
        ],
        isPopular: false,
        isFree: true
    },
    {
        id: 'pay_per_use',
        name: 'Trả phí theo lượt (Pay-per-use)',
        badge: 'Linh Hoạt ⚡',
        price: 5000,
        priceDisplay: '5.000 VNĐ',
        period: '/lần thử',
        credits: 1,
        desc: 'Phù hợp với người dùng không thường xuyên',
        features: [
            '1 lần thử đồ AI theo nhu cầu',
            'Chỉ trả tiền khi có nhu cầu sử dụng',
            'Tốc độ xử lý nhanh chóng',
            'Lưu ảnh vào Tủ đồ cá nhân'
        ],
        isPopular: false
    },
    {
        id: 'monthly',
        name: 'Gói tháng (Monthly Plan)',
        badge: 'Phổ Biến Nhất 🔥',
        price: 49000,
        priceDisplay: '49.000 VNĐ',
        period: '/tháng',
        credits: 999,
        desc: 'Phù hợp với người dùng thường xuyên',
        features: [
            'Không giới hạn lượt thử trong 30 ngày',
            'Chế độ Turbo tăng tốc xử lý (1.2s)',
            'Tải ảnh cá nhân của chính bạn không giới hạn',
            'Chất lượng hình ảnh sắc nét chuẩn HD',
            'Lưu trang phục vào Tủ đồ cá nhân'
        ],
        isPopular: true
    },
    {
        id: 'annual',
        name: 'Gói năm (Annual Plan)',
        badge: 'Tiết Kiệm Nhất ✨',
        price: 490000,
        priceDisplay: '490.000 VNĐ',
        period: '/năm',
        credits: 9999,
        desc: 'Dành cho người dùng trung thành',
        features: [
            'Không giới hạn lượt thử suốt 365 ngày',
            'Tiết kiệm 2 tháng so với đăng ký theo tháng',
            'Ưu tiên hàng đợi GPU siêu tốc cao nhất',
            'Độ nét Ultra HD 4K sắc sảo',
            'Hỗ trợ kỹ thuật 24/7 trực tiếp'
        ],
        isPopular: false
    }
];

// Helper: Lấy số lượt thử còn lại của khách hàng
function getUserCredits() {
    const saved = localStorage.getItem('vfit_user_credits');
    if (saved === null) {
        localStorage.setItem('vfit_user_credits', '3'); // Tặng 3 lượt dùng thử miễn phí ban đầu
        return 3;
    }
    return parseInt(saved, 10) || 0;
}

function setUserCredits(count) {
    localStorage.setItem('vfit_user_credits', count.toString());
}

function addCredits(count) {
    const current = getUserCredits();
    const updated = current + count;
    setUserCredits(updated);
    return updated;
}

// Helper: Lấy hoặc tạo mã chuyển khoản duy nhất
function getOrderCode() {
    let code = sessionStorage.getItem('vfit_order_code');
    if (!code) {
        code = Math.floor(1000 + Math.random() * 9000).toString();
        sessionStorage.setItem('vfit_order_code', code);
    }
    return code;
}

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
    statusMessage: '',

    // Checkout state
    selectedPlanId: 'monthly',
    showSuccessModal: false
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

// Toast notification helper
function showToast(message) {
    const existing = document.querySelector('.toast-notice');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notice';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Clipboard copy helper
window.copyToClipboard = function (text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Đã sao chép ${label || text}!`);
        }).catch(() => fallbackCopy(text, label));
    } else {
        fallbackCopy(text, label);
    }
};

function fallbackCopy(text, label) {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast(`Đã sao chép ${label || text}!`);
}

// Router Implementation
const navigateTo = url => {
    // If running in /static/frontend or file:// protocol, use hash routing
    if (location.pathname.includes('/static/frontend') || location.protocol === 'file:') {
        location.hash = '#' + url;
        router();
        return;
    }
    history.pushState(null, null, url);
    router();
};

const router = async () => {
    let currentPath = location.pathname;

    // Check if hash route is present
    if (location.hash && location.hash.startsWith('#/')) {
        currentPath = location.hash.slice(1);
    } else if (currentPath.endsWith('/index.html') || currentPath.endsWith('/static/frontend') || currentPath.endsWith('/static/frontend/')) {
        currentPath = '/';
    }

    // Strip any query strings from currentPath for route matching
    const [cleanPath, queryString] = currentPath.split('?');
    const query = queryString || (window.location.search ? window.location.search.slice(1) : '');

    // Parse URL params if any
    const urlParams = new URLSearchParams(query);
    if (urlParams.has('plan')) {
        const p = urlParams.get('plan');
        if (PRICING_PLANS.some(item => item.id === p)) {
            state.selectedPlanId = p;
        }
    }

    const routes = [
        { path: "/", view: homeView },
        { path: "/ai-demo", view: demoView },
        { path: "/product-catalog", view: catalogView },
        { path: "/pricing", view: pricingView },
        { path: "/checkout", view: checkoutView },
        { path: "/wardrobe", view: wardrobeView },
        { path: "/login", view: () => simplePageView('Đăng Nhập V-Fit Studio', 'Chào mừng bạn quay lại! Đăng nhập để đồng bộ tủ đồ của bạn.') },
        { path: "/sign-up", view: () => simplePageView('Đăng Ký Tài Khoản', 'Tạo tài khoản để nhận ngay 3 lượt thử đồ AI miễn phí.') },
        { path: "/about-us", view: () => simplePageView('Về V-Fit Studio', 'V-Fit Studio là giải pháp thử đồ trực tuyến thông minh dành cho khách hàng cá nhân, ứng dụng mô hình AI Deep Learning tiên tiến nhất.') },
        { path: "/contact-us", view: () => simplePageView('Hỗ Trợ Khách Hàng', 'Cần hỗ trợ thanh toán hoặc thắc mắc? Liên hệ chúng tôi qua email: support@vfit-studio.vn hoặc hotline: 0987.654.321.') },
        { path: "/frequently-asked-questions", view: () => simplePageView('Câu Hỏi Thường Gặp (FAQ)', '1. Thử đồ mất bao lâu? Chỉ từ 1-3 giây.\n2. Ảnh tải lên có an toàn không? Toàn bộ ảnh được mã hóa bảo mật.') },
        { path: "/404-error", view: () => simplePageView('404 - Không Tìm Thấy Trang', 'Trang bạn đang truy cập không tồn tại hoặc đã được chuyển dời.') }
    ];

    let match = routes.find(r => r.path === cleanPath);
    if (!match) {
        match = routes.find(r => r.path === "/404-error") || routes[0];
    }

    // Active link highlighting
    document.querySelectorAll('.nav-links a').forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === cleanPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    const appRoot = document.getElementById("app-root");
    const htmlContent = await match.view();
    appRoot.innerHTML = htmlContent;

    attachViewListeners();
};

window.addEventListener("popstate", router);
window.addEventListener("hashchange", router);

document.addEventListener("DOMContentLoaded", async () => {
    await fetchCatalog();
    checkApiHealth();

    document.body.addEventListener("click", e => {
        const linkEl = e.target.closest("[data-link]");
        if (linkEl) {
            e.preventDefault();
            const href = linkEl.getAttribute('href');
            navigateTo(href);
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
                badge.innerHTML = '● Máy chủ AI Sẵn Sàng';
                badge.title = `Kết nối: ${API_BASE}`;
                brandEl.appendChild(badge);
            }
        }
    } catch (e) {
        console.log("Backend offline or waking up on Render...");
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

    // Checkout plan selection listeners
    document.querySelectorAll('[data-plan-select]').forEach(el => {
        el.addEventListener('click', () => {
            const planId = el.getAttribute('data-plan-select');
            state.selectedPlanId = planId;
            try {
                const u = new URL(window.location.href);
                u.searchParams.set('plan', planId);
                history.replaceState(null, null, u.pathname + u.search + u.hash);
            } catch (e) { }
            router();
        });
    });

    // Payment confirmation listener
    const confirmPaymentBtn = document.getElementById('btn-confirm-payment');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', () => {
            const plan = PRICING_PLANS.find(p => p.id === state.selectedPlanId) || PRICING_PLANS.find(p => p.id === 'monthly') || PRICING_PLANS[2];
            addCredits(plan.credits);
            state.showSuccessModal = true;
            router();
        });
    }

    // Close modal listener
    const closeModalBtn = document.getElementById('btn-close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            state.showSuccessModal = false;
            navigateTo('/ai-demo');
        });
    }
}

// Trigger Virtual Try-On API Request
async function handleRunTryOn() {
    if (state.isGenerating) return;

    // Check credits
    const credits = getUserCredits();
    if (credits <= 0) {
        alert("Bạn đã hết lượt thử đồ AI miễn phí! Vui lòng nạp thêm lượt thử tại trang Thanh Toán để tiếp tục.");
        navigateTo('/checkout');
        return;
    }

    state.isGenerating = true;
    state.generationResult = null;
    state.generationError = null;
    state.statusMessage = 'Đang khởi tạo yêu cầu thử đồ AI...';
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

    state.statusMessage = 'AI đang ghép trang phục và tạo ánh sáng tự nhiên...';
    await router();

    try {
        const response = await fetch(`${API_BASE}/api/try-on`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
            state.generationResult = data;
            state.statusMessage = `Thành công trong ${data.processing_time}!`;
            // Deduct 1 credit
            setUserCredits(Math.max(0, credits - 1));
            // Save to wardrobe
            saveToWardrobe(data.output_url);
        } else {
            state.generationError = data.error || data.message || "Không thể tạo ảnh thử đồ.";
            if (data.fallback_url) {
                state.generationResult = {
                    output_url: data.fallback_url,
                    processing_time: 'ảnh mẫu minh họa',
                    id: data.id || '#TR-DEMO'
                };
            }
        }
    } catch (err) {
        console.error(err);
        state.generationError = `Không thể kết nối đến máy chủ Backend Render (${API_BASE}). Vui lòng kiểm tra lại dịch vụ Backend.`;
    } finally {
        state.isGenerating = false;
        await router();
    }
}

// Lưu ảnh kết quả vào tủ đồ cá nhân trong LocalStorage
function saveToWardrobe(outputUrl) {
    try {
        const existing = JSON.parse(localStorage.getItem('vfit_wardrobe') || '[]');
        const fullUrl = outputUrl.startsWith('http') ? outputUrl : `${API_BASE}${outputUrl}`;
        existing.unshift({
            url: fullUrl,
            date: new Date().toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            garment: state.selectedGarmentSample || 'Trang phục tùy chọn'
        });
        localStorage.setItem('vfit_wardrobe', JSON.stringify(existing.slice(0, 20)));
    } catch (e) {
        console.warn("Could not save to wardrobe:", e);
    }
}

// Helper: Format tiền tệ VNĐ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// --- Page Views ---

function homeView() {
    const credits = getUserCredits();
    return `
        <div class="hero">
            <div style="margin-bottom: 1.5rem;">
                <span class="user-credits-badge">
                    ✨ Bạn đang có: <strong style="color: #fff; font-size: 1.1rem; margin: 0 4px;">${credits}</strong> lượt thử đồ
                </span>
            </div>
            <h1>Phòng Thử Đồ Ảo AI <br><span class="highlight">Dành Riêng Cho Bạn</span></h1>
            <p>Không còn nỗi lo mua sắm online sai kích cỡ hay không hợp dáng. Với V-Fit Studio, bạn có thể ướm thử bất kỳ bộ váy áo nào lên chính cơ thể mình chỉ với 1 cú nhấp chuột!</p>
            <div class="nav-actions" style="justify-content: center; margin-top: 2rem; gap: 1rem;">
                <a href="/ai-demo" class="btn btn-primary" style="font-size: 1.1rem; padding: 0.8rem 2rem;" data-link>✨ Thử Đồ Ngay Bây Giờ</a>
                <a href="/product-catalog" class="btn btn-ghost" style="font-size: 1.1rem; padding: 0.8rem 2rem;" data-link>👗 Khám Phá Bộ Sưu Tập</a>
            </div>
        </div>

        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">✨</div>
                <h3>Hình Ảnh Chân Thực</h3>
                <p>Công nghệ AI mô phỏng chính xác chất liệu vải, nếp nhăn và độ rủ tự nhiên của trang phục trên cơ thể bạn.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <h3>Tốc Độ Thử Siêu Nhanh</h3>
                <p>Chỉ từ 1 đến 2 giây là bạn đã có ngay bức ảnh thử đồ hoàn hảo để tự tin quyết định trước khi mua sắm.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">💳</div>
                <h3>Thanh Toán Tiện Lợi (VietQR)</h3>
                <p>Nạp thêm lượt thử đồ dễ dàng qua chuyển khoản ngân hàng quét mã QR tự động. Tiết kiệm và linh hoạt.</p>
            </div>
        </div>
    `;
}

function demoView() {
    const credits = getUserCredits();

    let modelImgSrc = `${API_BASE}/static/images/Person_image/${state.selectedModelSample}`;
    if (state.selectedModelType === 'upload' && state.selectedModelFile) {
        modelImgSrc = URL.createObjectURL(state.selectedModelFile);
    }

    let garmentImgSrc = `${API_BASE}/static/images/Garment_image/${state.selectedGarmentSample}`;
    if (state.selectedGarmentType === 'upload' && state.selectedGarmentFile) {
        garmentImgSrc = URL.createObjectURL(state.selectedGarmentFile);
    }

    const modelsList = state.catalog.models && state.catalog.models.length > 0 ? state.catalog.models : [
        { id: 'anh2.png', name: 'Người Mẫu 1', url: `${API_BASE}/static/images/Person_image/anh2.png` },
        { id: 'pic1.png', name: 'Người Mẫu 2', url: `${API_BASE}/static/images/Person_image/pic1.png` }
    ];

    const garmentsList = state.catalog.garments && state.catalog.garments.length > 0 ? state.catalog.garments : [
        { id: 'vay1.png', name: 'Đầm Hoa Mùa Hè', url: `${API_BASE}/static/images/Garment_image/vay1.png` },
        { id: 'ao1.png', name: 'Áo Sơ Mi Trắng', url: `${API_BASE}/static/images/Garment_image/ao1.png` },
        { id: 'quan1.png', name: 'Quần Âu Dáng Suông', url: `${API_BASE}/static/images/Garment_image/quan1.png` }
    ];

    return `
        <div class="view-container">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <h1><span class="highlight">Phòng Thử Đồ AI Trực Tuyến</span></h1>
                    <p style="margin: 0;">Chọn người mẫu hoặc tải ảnh bạn lên, sau đó chọn trang phục để ngắm diện mạo mới.</p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="user-credits-badge">
                        🎟️ Lượt thử còn lại: <strong style="color: #fff; font-size: 1.1rem; margin: 0 4px;">${credits}</strong>
                    </span>
                    <a href="/checkout" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" data-link>+ Nạp Thêm</a>
                </div>
            </div>

            <div class="demo-layout">
                <!-- MODEL SELECTOR CARD -->
                <div class="selector-card">
                    <div class="selector-header">
                        <span class="selector-title">👤 1. Ảnh Người Mẫu / Bản Thân</span>
                        <div class="tab-buttons">
                            <button class="tab-btn ${state.selectedModelType === 'sample' ? 'active' : ''}" onclick="state.selectedModelType='sample'; router();">Mẫu Có Sẵn</button>
                            <button class="tab-btn ${state.selectedModelType === 'upload' ? 'active' : ''}" onclick="state.selectedModelType='upload'; router();">Tải Ảnh Lên</button>
                        </div>
                    </div>

                    ${state.selectedModelType === 'sample' ? `
                        <div class="sample-grid">
                            ${modelsList.map(m => `
                                <div class="sample-item ${state.selectedModelSample === m.id ? 'selected' : ''}" data-model-sample="${m.id}">
                                    <img src="${m.url}" alt="${m.name}" onerror="this.src='${m.url.replace(API_BASE, '')}'">
                                    <div class="sample-name">${m.name}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        ${state.selectedModelFile ? `
                            <div class="preview-container">
                                <img src="${modelImgSrc}" alt="Ảnh người mẫu bạn đã chọn">
                                <button class="remove-btn" onclick="state.selectedModelFile=null; state.selectedModelType='sample'; router();">✕ Đổi ảnh khác</button>
                            </div>
                        ` : `
                            <div class="upload-zone" onclick="document.getElementById('model-file-input').click()">
                                <div style="font-size: 2.2rem; margin-bottom: 0.5rem">📸</div>
                                <div style="font-weight: 600;">Bấm để tải ảnh người mẫu hoặc ảnh bạn lên</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">Khuyên dùng ảnh chụp toàn thân hoặc nửa người rõ nét</div>
                                <input type="file" id="model-file-input" accept="image/*">
                            </div>
                        `}
                    `}
                </div>

                <!-- GARMENT SELECTOR CARD -->
                <div class="selector-card">
                    <div class="selector-header">
                        <span class="selector-title">👗 2. Trang Phục Muốn Thử</span>
                        <div class="tab-buttons">
                            <button class="tab-btn ${state.selectedGarmentType === 'sample' ? 'active' : ''}" onclick="state.selectedGarmentType='sample'; router();">Bộ Sưu Tập</button>
                            <button class="tab-btn ${state.selectedGarmentType === 'upload' ? 'active' : ''}" onclick="state.selectedGarmentType='upload'; router();">Tải Quần Áo Lên</button>
                        </div>
                    </div>

                    ${state.selectedGarmentType === 'sample' ? `
                        <div class="sample-grid">
                            ${garmentsList.map(g => `
                                <div class="sample-item ${state.selectedGarmentSample === g.id ? 'selected' : ''}" data-garment-sample="${g.id}">
                                    <img src="${g.url}" alt="${g.name}" onerror="this.src='${g.url.replace(API_BASE, '')}'">
                                    <div class="sample-name">${g.name}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        ${state.selectedGarmentFile ? `
                            <div class="preview-container">
                                <img src="${garmentImgSrc}" alt="Trang phục bạn đã tải lên">
                                <button class="remove-btn" onclick="state.selectedGarmentFile=null; state.selectedGarmentType='sample'; router();">✕ Đổi trang phục</button>
                            </div>
                        ` : `
                            <div class="upload-zone" onclick="document.getElementById('garment-file-input').click()">
                                <div style="font-size: 2.2rem; margin-bottom: 0.5rem">👕</div>
                                <div style="font-weight: 600;">Bấm để tải ảnh áo, quần hoặc váy bạn thích</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">Khuyên dùng ảnh chụp phẳng hoặc ảnh sản phẩm nền trắng</div>
                                <input type="file" id="garment-file-input" accept="image/*">
                            </div>
                        `}
                    `}
                </div>
            </div>

            <!-- OPTIONS PANEL -->
            <div class="options-panel">
                <h3 style="margin-bottom: 0.75rem; font-size: 1.1rem;">⚡ Tùy Chọn Thử Đồ Nhanh</h3>
                <div class="options-grid">
                    <div class="toggle-container">
                        <span>Chế độ Turbo (Thử đồ siêu tốc 1.2s)</span>
                        <label class="switch">
                            <input type="checkbox" id="opt-turbo" ${state.turbo ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="font-size: 0.9rem;">Định dạng ảnh</label>
                        <select id="opt-format" class="form-input" style="padding: 0.4rem 0.8rem;">
                            <option value="jpg" ${state.outputFormat === 'jpg' ? 'selected' : ''}>JPG (Chuẩn sắc nét)</option>
                            <option value="png" ${state.outputFormat === 'png' ? 'selected' : ''}>PNG (Độ phân giải cao)</option>
                            <option value="webp" ${state.outputFormat === 'webp' ? 'selected' : ''}>WEBP (Tải nhanh)</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="font-size: 0.9rem;">Chất lượng hình ảnh (95%)</label>
                        <input type="range" id="opt-quality" min="70" max="100" value="95" style="width: 100%;">
                    </div>
                </div>
            </div>

            <!-- ACTION BUTTON -->
            <div style="text-align: center; margin: 2rem 0;">
                <button id="btn-run-tryon" class="btn btn-primary" style="font-size: 1.2rem; padding: 1.1rem 3.5rem; border-radius: 50px;" ${state.isGenerating ? 'disabled' : ''}>
                    ${state.isGenerating ? `⚡ Đang xử lý thử đồ AI...` : `✨ Bắt Đầu Mặc Thử Lên Người`}
                </button>
            </div>

            <!-- LOADING INDICATOR -->
            ${state.isGenerating ? `
                <div style="margin: 2rem 0; padding: 2.5rem; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); text-align: center;">
                    <div class="spinner"></div>
                    <div style="font-size: 1.2rem; font-weight: 600; color: var(--accent-primary)">AI Đang Xử Lý Thử Đồ Cho Bạn...</div>
                    <p style="font-size: 0.95rem; margin-top: 0.5rem; color: var(--text-secondary)">${state.statusMessage || 'Hệ thống đang ghép quần áo lên vóc dáng của bạn...'}</p>
                </div>
            ` : ''}

            <!-- ERROR ALERT IF ANY -->
            ${state.generationError ? `
                <div style="margin: 1.5rem 0; padding: 1rem 1.5rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; color: #f87171; text-align: left;">
                    <strong>⚠️ Thông báo:</strong> ${state.generationError}
                </div>
            ` : ''}

            <!-- RESULT SECTION -->
            ${state.generationResult ? `
                <div class="result-card">
                    <div class="result-header">
                        <h3>🎉 Kết Quả Thử Đồ Của Bạn</h3>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge badge-success">Thời gian: ${state.generationResult.processing_time}</span>
                            <a href="${state.generationResult.output_url.startsWith('http') ? state.generationResult.output_url : `${API_BASE}${state.generationResult.output_url}`}" download="vfit-ket-qua.jpg" target="_blank" class="btn btn-ghost" style="padding: 0.4rem 1rem; font-size: 0.9rem;">⬇ Tải Ảnh Về Máy</a>
                            <a href="/wardrobe" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.9rem;" data-link>👗 Xem Tủ Đồ</a>
                        </div>
                    </div>

                    <div class="result-comparison">
                        <div class="result-img-box">
                            <div style="padding: 0.5rem; background: rgba(0,0,0,0.5); font-weight: 600; text-align: center; font-size: 0.85rem;">Ảnh Người Mẫu Ban Đầu</div>
                            <img src="${modelImgSrc}" alt="Input Model">
                        </div>

                        <div style="font-size: 2.5rem; color: var(--accent-primary)">➔</div>

                        <div class="result-img-box" style="border-color: var(--accent-primary); box-shadow: 0 0 25px rgba(99, 102, 241, 0.35);">
                            <div style="padding: 0.5rem; background: var(--accent-gradient); color: white; font-weight: 600; text-align: center; font-size: 0.85rem;">Kết Quả Mặc Thử Bởi V-Fit AI</div>
                            <img src="${state.generationResult.output_url.startsWith('http') ? state.generationResult.output_url : `${API_BASE}${state.generationResult.output_url}`}" alt="AI Try-on Output">
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function catalogView() {
    const garmentsList = state.catalog.garments && state.catalog.garments.length > 0 ? state.catalog.garments : [
        { id: 'vay1.png', name: 'Đầm Hoa Mùa Hè Nữ Tính', category: 'Váy Liền', price: '289.000đ', url: `${API_BASE}/static/images/Garment_image/vay1.png` },
        { id: 'ao1.png', name: 'Áo Sơ Mi Trắng Thanh Lịch', category: 'Áo Nữ', price: '189.000đ', url: `${API_BASE}/static/images/Garment_image/ao1.png` },
        { id: 'quan1.png', name: 'Quần Âu Dáng Suông Tôn Dáng', category: 'Quần Nữ', price: '249.000đ', url: `${API_BASE}/static/images/Garment_image/quan1.png` }
    ];

    return `
        <div class="view-container">
            <h1>Bộ Sưu Tập <span class="highlight">Thời Trang Mới</span></h1>
            <p>Chọn mẫu trang phục bạn yêu thích dưới đây để ướm thử ngay trong phòng thử đồ AI.</p>

            <div class="catalog-grid">
                ${garmentsList.map(g => `
                    <div class="catalog-card">
                        <img src="${g.url}" alt="${g.name}" class="catalog-card-img" onerror="this.src='${g.url.replace(API_BASE, '')}'">
                        <div class="catalog-card-body">
                            <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary)">${g.category || 'Thời Trang'}</span>
                            <div class="catalog-card-title">${g.name}</div>
                            <div class="catalog-card-price">${g.price || '199.000đ'}</div>
                            <div style="display: flex; gap: 0.5rem; margin-top: auto;">
                                <button class="btn btn-primary" style="flex: 1; padding: 0.6rem 0.5rem; font-size: 0.9rem;" onclick="
                                    state.selectedGarmentType='sample';
                                    state.selectedGarmentSample='${g.id}';
                                    navigateTo('/ai-demo');
                                ">✨ Thử Đồ Ngay</button>
                                <a href="/checkout?plan=monthly" class="btn btn-ghost" style="padding: 0.6rem 0.8rem; font-size: 0.9rem;" data-link title="Mua gói nạp thử">⚡</a>
                            </div>
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
            <div style="text-align: center; max-width: 700px; margin: 0 auto 3rem;">
                <h1>Bảng Giá <span class="highlight">Gói Thử Đồ AI</span></h1>
                <p>Nạp lượt thử đồ linh hoạt, thanh toán tiện lợi qua chuyển khoản ngân hàng VietQR. Không phát sinh chi phí ẩn!</p>
            </div>

            <div class="pricing-grid">
                ${PRICING_PLANS.map(plan => `
                    <div class="feature-card" style="text-align: left; display: flex; flex-direction: column; ${plan.isPopular ? 'border-color: var(--accent-primary); transform: scale(1.04); position: relative; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.25);' : ''}">
                        ${plan.badge ? `<div style="display: inline-block; width: fit-content; background: ${plan.isPopular ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.08)'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.75rem;">${plan.badge}</div>` : ''}
                        <h3>${plan.name}</h3>
                        <div style="font-size: 2.1rem; font-weight: 700; margin: 0.75rem 0; color: #fff;">
                            ${plan.priceDisplay}
                            <span style="font-size: 0.9rem; font-weight: 400; color: var(--text-secondary)">${plan.period}</span>
                        </div>
                        <p style="font-size: 0.9rem; min-height: 40px; color: var(--text-secondary);">${plan.desc}</p>
                        
                        <ul style="list-style: none; padding: 0; margin: 1.5rem 0 2rem; color: var(--text-secondary); font-size: 0.92rem; flex: 1;">
                            ${plan.features.map(f => `<li style="margin-bottom: 0.6rem; display: flex; align-items: center; gap: 8px;"><span style="color: #4ade80;">✓</span> ${f}</li>`).join('')}
                        </ul>

                        ${plan.isFree ? `
                            <a href="/ai-demo" class="btn btn-ghost" style="width: 100%; text-align: center; display: block;" data-link>
                                🎁 Bắt Đầu Dùng Thử Ngay
                            </a>
                        ` : `
                            <a href="/checkout?plan=${plan.id}" class="btn ${plan.isPopular ? 'btn-primary' : 'btn-ghost'}" style="width: 100%; text-align: center; display: block;" data-link>
                                ⚡ Chọn Gói & Thanh Toán
                            </a>
                        `}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// =========================================================================
// 4. TRANG THANH TOÁN (CHECKOUT VIEW) - HỖ TRỢ CHUYỂN KHOẢN NGÂN HÀNG & VIETQR
// =========================================================================
function checkoutView() {
    const selectedPlan = PRICING_PLANS.find(p => p.id === state.selectedPlanId) || PRICING_PLANS.find(p => p.id === 'monthly') || PRICING_PLANS[2];
    const orderCode = `${PAYMENT_CONFIG.transferPrefix}${getOrderCode()}`;
    const amount = selectedPlan.price;
    const currentCredits = getUserCredits();

    // Dùng file ảnh QR money.png nếu được cấu hình, hoặc tự động tạo qua VietQR
    const qrUrl = PAYMENT_CONFIG.qrImage || `https://img.vietqr.io/image/${PAYMENT_CONFIG.bankId}-${PAYMENT_CONFIG.accountNumber}-compact2.png?amount=${amount}&addInfo=${orderCode}&accountName=${encodeURIComponent(PAYMENT_CONFIG.accountName)}`;

    return `
        <div class="view-container">
            <div style="margin-bottom: 1rem;">
                <h1>Trang <span class="highlight">Thanh Toán & Kích Hoạt Gói</span></h1>
                <p>Quét mã VietQR hoặc chuyển khoản trực tiếp qua ngân hàng. Hệ thống kích hoạt lượt thử ngay sau khi bạn xác nhận!</p>
            </div>

            <div class="checkout-container">
                <!-- CỘT BÊN TRÁI: CHỌN GÓI & TÓM TẮT ĐƠN HÀNG -->
                <div>
                    <div class="checkout-card" style="margin-bottom: 1.5rem;">
                        <h3 style="margin-bottom: 1rem; font-size: 1.25rem;">1. Chọn Gói Dịch Vụ Cần Dùng</h3>
                        
                        ${PRICING_PLANS.map(plan => `
                            <div class="checkout-plan-card ${plan.id === selectedPlan.id ? 'active' : ''}" data-plan-select="${plan.id}">
                                <div class="checkout-plan-info">
                                    <h4>
                                        ${plan.name}
                                        ${plan.isPopular ? '<span class="badge badge-success" style="font-size: 0.7rem;">Hot</span>' : ''}
                                    </h4>
                                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${plan.desc}</div>
                                </div>
                                <div class="checkout-plan-price" style="font-size: 1.15rem; text-align: right;">
                                    ${plan.priceDisplay}
                                    <div style="font-size: 0.75rem; font-weight: 400; color: var(--text-secondary);">${plan.period}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- TÓM TẮT ĐƠN HÀNG -->
                    <div class="checkout-card">
                        <h3 style="margin-bottom: 1rem; font-size: 1.25rem;">2. Tóm Tắt Đơn Hàng</h3>
                        
                        <div class="bank-row">
                            <span class="bank-label">Gói đã chọn:</span>
                            <span class="bank-value" style="color: #fff;">${selectedPlan.name}</span>
                        </div>
                        <div class="bank-row">
                            <span class="bank-label">Quyền lợi nhận được:</span>
                            <span class="bank-value" style="color: #4ade80;">
                                ${selectedPlan.id === 'free' ? '3 lần thử đồ miễn phí' :
            selectedPlan.id === 'pay_per_use' ? '+1 lượt thử đồ AI' :
                selectedPlan.id === 'monthly' ? 'Không giới hạn trong 30 ngày' :
                    'Không giới hạn trong 365 ngày'}
                            </span>
                        </div>
                        <div class="bank-row">
                            <span class="bank-label">Lượt hiện có của bạn:</span>
                            <span class="bank-value">${currentCredits} lượt</span>
                        </div>
                        <div class="bank-row" style="border-top: 1px dashed var(--border-color); margin-top: 0.5rem; padding-top: 1rem;">
                            <span class="bank-label" style="font-size: 1.1rem; font-weight: 700; color: #fff;">Tổng tiền thanh toán:</span>
                            <span class="checkout-plan-price" style="font-size: 1.5rem;">${selectedPlan.price === 0 ? '0 VNĐ (Miễn Phí)' : formatCurrency(amount)}</span>
                        </div>

                        ${selectedPlan.price > 0 ? `
                            <ul class="payment-steps">
                                <li><strong>Bước 1:</strong> Mở ứng dụng Ngân hàng bất kỳ (MB, Vietcombank, Techcombank, VPBank, Momo, ZaloPay...)</li>
                                <li><strong>Bước 2:</strong> Quét mã QR ở cột bên phải hoặc chuyển tiền theo đúng Số tài khoản & Nội dung.</li>
                                <li><strong>Bước 3:</strong> Bấm nút <strong>"Tôi đã chuyển khoản thành công"</strong> bên dưới để hoàn tất.</li>
                            </ul>
                        ` : ''}
                    </div>
                </div>

                <!-- CỘT BÊN PHẢI: MÃ VIETQR HOẶC KÍCH HOẠT MIỄN PHÍ -->
                <div>
                    ${selectedPlan.price === 0 ? `
                        <div class="checkout-card" style="text-align: center; padding: 3rem 2rem;">
                            <div style="font-size: 4rem; margin-bottom: 1rem;">🎁</div>
                            <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">Gói Dùng Thử Miễn Phí</h3>
                            <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 2rem;">
                                Bạn không cần chuyển khoản hay thanh toán bất kỳ chi phí nào.<br>
                                Mỗi khách hàng mới được tặng sẵn <strong>3 lần thử đồ AI</strong> để trải nghiệm chất lượng ảnh!
                            </p>
                            <a href="/ai-demo" class="btn btn-primary" style="padding: 1rem 2.5rem; font-size: 1.1rem; display: inline-block; border-radius: 50px;" data-link>
                                ✨ Vào Phòng Thử Đồ Ngay
                            </a>
                        </div>
                    ` : `
                        <div class="checkout-card">
                            <h3 style="margin-bottom: 1rem; font-size: 1.25rem; text-align: center;">Quét Mã QR Để Thanh Toán</h3>
                            
                            <!-- VIETQR IMAGE -->
                            <div class="vietqr-wrapper">
                                <img src="${qrUrl}" alt="Mã thanh toán VietQR" class="vietqr-img" id="vietqr-image">
                                <div class="vietqr-caption">Quét bằng mọi ứng dụng ngân hàng hoặc ví điện tử</div>
                            </div>

                            <!-- CHI TIẾT SỐ TÀI KHOẢN -->
                            <div class="bank-details-card">
                                <div class="bank-row">
                                    <span class="bank-label">Ngân hàng:</span>
                                    <div class="bank-value-group">
                                        <span class="bank-value">${PAYMENT_CONFIG.bankName}</span>
                                    </div>
                                </div>

                                <div class="bank-row">
                                    <span class="bank-label">Số tài khoản:</span>
                                    <div class="bank-value-group">
                                        <span class="bank-value" style="font-size: 1.1rem; color: #38bdf8;">${PAYMENT_CONFIG.accountNumber}</span>
                                        <button class="copy-btn" onclick="copyToClipboard('${PAYMENT_CONFIG.accountNumber}', 'Số tài khoản')">📋 Sao chép</button>
                                    </div>
                                </div>

                                <div class="bank-row">
                                    <span class="bank-label">Chủ tài khoản:</span>
                                    <div class="bank-value-group">
                                        <span class="bank-value">${PAYMENT_CONFIG.accountName}</span>
                                    </div>
                                </div>

                                <div class="bank-row">
                                    <span class="bank-label">Số tiền:</span>
                                    <div class="bank-value-group">
                                        <span class="bank-value" style="color: #f43f5e; font-weight: 700;">${formatCurrency(amount)}</span>
                                        <button class="copy-btn" onclick="copyToClipboard('${amount}', 'Số tiền')">📋 Sao chép</button>
                                    </div>
                                </div>

                                <div class="bank-row">
                                    <span class="bank-label">Nội dung CK:</span>
                                    <div class="bank-value-group">
                                        <span class="bank-value highlight-code">${orderCode}</span>
                                        <button class="copy-btn" onclick="copyToClipboard('${orderCode}', 'Nội dung chuyển khoản')">📋 Sao chép</button>
                                    </div>
                                </div>
                            </div>

                            <!-- NÚT XÁC NHẬN CHUYỂN KHOẢN -->
                            <button id="btn-confirm-payment" class="btn btn-primary" style="width: 100%; padding: 1rem; font-size: 1.1rem; border-radius: 12px; margin-top: 0.5rem;">
                                ✅ Tôi Đã Chuyển Khoản Thành Công
                            </button>
                            
                            <div style="text-align: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-secondary);">
                                🛡️ Giao dịch được bảo mật và tự động ghi nhận ngay lập tức.
                            </div>
                        </div>
                    `}
                </div>
            </div>

            <!-- MODAL XÁC NHẬN THÀNH CÔNG -->
            ${state.showSuccessModal ? `
                <div class="modal-backdrop">
                    <div class="modal-card">
                        <div style="font-size: 3.5rem; margin-bottom: 1rem;">🎉</div>
                        <h2>Kích Hoạt Gói Thành Công!</h2>
                        <p style="margin-bottom: 1.5rem;">
                            Hệ thống đã ghi nhận thanh toán cho mã <strong>${orderCode}</strong>.<br>
                            Gói <strong>${selectedPlan.name}</strong> đã được kích hoạt thành công trên tài khoản của bạn!
                        </p>
                        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem;">
                            Quyền lợi: <strong style="color: #4ade80;">
                                ${selectedPlan.id === 'pay_per_use' ? '+1 lượt thử đồ AI' :
                selectedPlan.id === 'monthly' ? 'Không giới hạn 30 ngày' :
                    selectedPlan.id === 'annual' ? 'Không giới hạn 365 ngày' :
                        '3 lần thử miễn phí'}
                            </strong>
                        </div>
                        <button id="btn-close-modal" class="btn btn-primary" style="width: 100%; padding: 0.85rem; font-size: 1.1rem;">
                            ✨ Vào Phòng Thử Đồ Ngay
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// TỦ ĐỒ CÁ NHÂN (MY WARDROBE)
function wardrobeView() {
    let wardrobeItems = [];
    try {
        wardrobeItems = JSON.parse(localStorage.getItem('vfit_wardrobe') || '[]');
    } catch (e) {
        wardrobeItems = [];
    }

    return `
        <div class="view-container">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
                <div>
                    <h1>Tủ Đồ Của <span class="highlight">Tôi</span></h1>
                    <p style="margin: 0;">Lưu giữ những bộ trang phục bạn đã từng ướm thử để dễ dàng xem lại bất cứ lúc nào.</p>
                </div>
                <a href="/ai-demo" class="btn btn-primary" data-link>+ Thử Thêm Trang Phục Mới</a>
            </div>

            ${wardrobeItems.length === 0 ? `
                <div style="text-align: center; padding: 4rem 2rem; background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-color); max-width: 600px; margin: 2rem auto;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">👗</div>
                    <h3>Tủ đồ của bạn hiện đang trống</h3>
                    <p>Hãy vào phòng thử đồ AI để ướm thử những bộ cánh lộng lẫy và lưu lại tại đây nhé!</p>
                    <a href="/ai-demo" class="btn btn-primary" style="margin-top: 1rem;" data-link>Khám Phá Phòng Thử Đồ</a>
                </div>
            ` : `
                <div class="catalog-grid">
                    ${wardrobeItems.map((item, idx) => `
                        <div class="catalog-card">
                            <img src="${item.url}" alt="Thử đồ ${idx + 1}" class="catalog-card-img" style="height: 320px;">
                            <div class="catalog-card-body">
                                <div class="catalog-card-title">${item.garment || 'Trang phục AI'}</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">🕒 ${item.date}</div>
                                <a href="${item.url}" download="outfit-${idx + 1}.jpg" target="_blank" class="btn btn-ghost" style="width: 100%; text-align: center;">⬇ Tải Ảnh Gốc</a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

function simplePageView(title, description) {
    return `
        <div class="view-container" style="max-width: 700px; margin: 0 auto; text-align: center;">
            <h2>${title}</h2>
            <p style="white-space: pre-line; line-height: 1.8;">${description}</p>
            ${title.includes('Đăng Nhập') || title.includes('Đăng Ký') ? `
                <div style="max-width: 420px; margin: 2rem auto; background: var(--bg-card); padding: 2.5rem; border-radius: 16px; border: 1px solid var(--border-color); text-align: left;">
                    <div class="form-group">
                        <label class="form-label">Email hoặc Số điện thoại</label>
                        <input type="text" class="form-input" placeholder="nguyenvana@gmail.com">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Mật khẩu</label>
                        <input type="password" class="form-input" placeholder="••••••••">
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 0.8rem;" onclick="alert('Đăng nhập thành công!'); navigateTo('/ai-demo');">
                        ${title.includes('Đăng Nhập') ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản & Nhận Lượt Thử'}
                    </button>
                </div>
            ` : ''}
            <div style="margin-top: 2rem;">
                <a href="/ai-demo" class="btn btn-ghost" data-link>← Quay Lại Phòng Thử Đồ</a>
            </div>
        </div>
    `;
}
