// ==========================================
// app.js - CEREBRO Y LÓGICA DE VORTEX COINS V2
// ==========================================

// 1. Configuración de Supabase
const SUPABASE_URL = 'https://uxefijfncvhvbqsorgyg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DDrra45YT-TCvpSXtoAQ0g_MtTlPTkD';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let currentProducts = [];
let selectedFile = null;
let depositSelectedFile = null;
let globalExchangeRate = 800; // Fallback
let globalSettingsId = null;
let globalPaymentInfo = null;
let globalDisplayCurrency = 'BS';
let globalSocialLinks = { facebook: '', instagram: '', tiktok: '' };

function formatPrice(usdtPrice) {
    if (globalDisplayCurrency === 'BS') {
        return `${(usdtPrice * globalExchangeRate).toLocaleString('es-VE')} Bs`;
    }
    return `${Number(usdtPrice).toFixed(2)} USDT`;
}

window.changeGlobalCurrency = function(curr) {
    globalDisplayCurrency = curr;
    router(); // Re-render the current view
};

// ==========================================
// 2. ENRUTADOR (SPA ROUTER)
// ==========================================
const appContainer = document.getElementById('app-container');

const routes = {
    '#/': renderHome,
    '#/free-fire': () => renderCatalog('free_fire', 'Free Fire', '🔥', 'var(--orange)'),
    '#/blood-strike': () => renderCatalog('blood_strike', 'Blood Strike', '🩸', 'var(--pink)'),
    '#/streaming': () => renderCatalog('streaming', 'Streaming', '🍿', 'var(--blue-electric)'),
    '#/login': renderDashboardOrLogin,
    '#/admin': renderAdmin,
    '#/terms': () => window.renderTerms()
};

function router() {
    const path = window.location.hash || '#/';
    const renderFunction = routes[path] || routes['#/'];
    renderFunction();
    updateNavbar();
    window.scrollTo(0, 0);
}

window.navigateTo = function(path) {
    window.location.hash = path.startsWith('#') ? path : '#' + path;
};

window.addEventListener('hashchange', router);

// Profile Edit Logic
const profileOverlay = document.getElementById('profile-modal-overlay');

window.openProfileModal = function() {
    if (!currentProfile) return;
    document.getElementById('prof-name').value = currentProfile.full_name || '';
    document.getElementById('prof-whatsapp').value = currentProfile.whatsapp || '';
    document.getElementById('prof-email').value = currentProfile.email || currentUser.email || '';
    document.getElementById('prof-password').value = '';
    profileOverlay.classList.add('active');
};

window.closeProfileModal = function() {
    profileOverlay.classList.remove('active');
};

document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const btn = document.getElementById('btn-submit-profile');
    btn.disabled = true;
    btn.textContent = "Guardando...";

    const name = document.getElementById('prof-name').value.trim();
    const whatsapp = document.getElementById('prof-whatsapp').value.trim();
    const email = document.getElementById('prof-email').value.trim();
    const password = document.getElementById('prof-password').value;

    if (!/^\+\d{10,15}$/.test(whatsapp)) {
        alert("El número de WhatsApp debe incluir el código de país y empezar con '+' (Ej: +58412...).");
        btn.disabled = false;
        btn.textContent = "Guardar Cambios";
        return;
    }

    try {
        // Update public.profiles
        const { error: profileError } = await supabaseClient.from('profiles').update({
            full_name: name,
            whatsapp: whatsapp,
            email: email
        }).eq('id', currentUser.id);

        if (profileError) throw profileError;

        // Update auth user if email or password changed
        let authUpdates = {};
        if (email && email !== currentUser.email) authUpdates.email = email;
        if (password) authUpdates.password = password;

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabaseClient.auth.updateUser(authUpdates);
            if (authError) throw authError;
        }

        alert("¡Perfil actualizado con éxito!");
        await loadProfile(); // Reload data
        closeProfileModal();
        renderDashboardOrLogin(); // Refresh UI

    } catch(e) {
        alert("Error al actualizar perfil: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar Cambios";
    }
});

// ==========================================
// 3. INICIALIZACIÓN
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    console.log("Iniciando Vortex Coins V2...");
    
    try {
        await loadSettings();
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            await loadProfile();
            loadNotifications();
            setupRealtimeNotifications();
            if (window.OneSignal) {
                OneSignal.push(function() {
                    OneSignal.login(currentUser.id);
                });
            }
        }
        
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            currentUser = session ? session.user : null;
            if (currentUser) {
                await loadProfile();
                loadNotifications();
                setupRealtimeNotifications();
                if (window.OneSignal) {
                    OneSignal.push(function() {
                        OneSignal.login(currentUser.id);
                    });
                }
            } else {
                currentProfile = null;
                document.getElementById('notifications-wrapper').style.display = 'none';
                if (window.OneSignal) {
                    OneSignal.push(function() {
                        OneSignal.logout();
                    });
                }
            }
            updateNavbar();
            
            // Re-render if on login or admin page
            if (window.location.hash === '#/login' || window.location.hash === '#/admin') {
                router();
            }
        });

        // Mostrar aviso en iOS si no es PWA (Standalone)
        const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isIos() && !isStandalone) {
            const iosBanner = document.getElementById('ios-pwa-banner');
            if (iosBanner) iosBanner.style.display = 'block';
        }

        // Cargar logo y favicon del sitio
        try {
            const { data: logoData } = await supabaseClient.from('ui_images').select('url').eq('key', 'logo').single();
            if (logoData && logoData.url) {
                updateFaviconAndLogo(logoData.url);
            }
        } catch(e) { console.warn("Favicon no configurado aún:", e); }

    } catch (e) {
        console.error("Error de inicialización:", e);
    }

    if (!window.location.hash) window.location.hash = '#/';
    else router();
});

// ==========================================
// 13. CARRUSEL DE OFERTAS
// ==========================================
let currentCarouselIndex = 0;
let specialOffersData = [];

window.loadSpecialOffers = async function(categoryFilter) {
    const container = document.getElementById('offers-carousel-container');
    if (!container) return;

    try {
        let query = supabaseClient.from('special_offers').select('*').eq('is_active', true);
        if (categoryFilter) {
            query = query.eq('category', categoryFilter);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(8);
        if (error) throw error;
        
        specialOffersData = data || [];
        if (specialOffersData.length === 0) {
            container.innerHTML = '';
            return;
        }

        renderCarousel();
    } catch(e) {
        console.error("Error cargando ofertas:", e);
    }
};

window.renderCarousel = function() {
    const container = document.getElementById('offers-carousel-container');
    if (!container || specialOffersData.length === 0) return;

    container.innerHTML = `
        <h3 style="color: var(--gold); font-family: var(--font-heading); margin-bottom: 15px; display: flex; align-items: center; justify-content: center; gap: 10px;">
            ✨ Ofertas Especiales ✨
        </h3>
        <div id="offers-scroll-wrapper" class="no-scrollbar" style="display: flex; gap: 15px; overflow-x: auto; scrollbar-width: none; padding-bottom: 10px; cursor: grab;">
            ${specialOffersData.map(offer => `
                <div class="product-card" style="flex: 0 0 auto; width: 250px; text-align: center; border-color: var(--gold); background: linear-gradient(rgba(11,15,25,0.8), rgba(11,15,25,0.95));" onclick="openPromoCheckout('${offer.id}')">
                    <img src="${offer.image_url}" alt="${offer.title}" style="max-width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; pointer-events: none;">
                    <div style="font-weight: bold; color: white; pointer-events: none;">${offer.title}</div>
                    <div style="color: var(--cyan-neon); font-size: 1.2rem; font-weight: bold; margin-top: 5px; pointer-events: none;">${formatPrice(offer.price_usdt)}</div>
                    <button class="btn btn-outline" style="margin-top: 10px; width: 100%; border-color: var(--gold); color: var(--gold); padding: 5px; pointer-events: none;">Adquirir Oferta</button>
                </div>
            `).join('')}
        </div>
    `;
    setTimeout(() => setupDraggableAutoScroll('offers-scroll-wrapper', 1), 100);
};

// Utilidad para hacer carruseles arrastrables y auto-deslizables con loop infinito
window.setupDraggableAutoScroll = function(containerId, speed = 1) {
    const slider = document.getElementById(containerId);
    if (!slider) return;

    // Clonar elementos para asegurar que el carrusel siempre se vea lleno y tenga efecto infinito
    const originalChildren = Array.from(slider.children);
    if (originalChildren.length === 0) return;
    
    // Multiplicador arbitrario para asegurar de que el ancho sea enorme
    // (min 10 iteraciones para garantizar que sobrepasa el ancho de la pantalla holgadamente)
    const multiplier = Math.max(10, Math.ceil(20 / originalChildren.length));
    
    for (let i = 1; i < multiplier; i++) {
        originalChildren.forEach(child => {
            const clone = child.cloneNode(true);
            slider.appendChild(clone);
        });
    }

    let isDown = false;
    let startX;
    let scrollLeft;
    let isHovered = false;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.style.cursor = 'grabbing';
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.style.cursor = 'grab';
        isHovered = false;
    });
    slider.addEventListener('mouseenter', () => {
        isHovered = true;
    });
    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.style.cursor = 'grab';
    });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });

    slider.addEventListener('touchstart', () => isHovered = true, {passive: true});
    slider.addEventListener('touchend', () => {
        isHovered = false;
        isDown = false;
    }, {passive: true});

    // Calcular el ancho de UN set completo original midiendo la distancia al primer clon
    // Esto es exacto porque tiene en cuenta los gaps (espacios) de CSS flex
    const getFirstSetWidth = () => {
        const firstClone = slider.children[originalChildren.length];
        return firstClone ? (firstClone.offsetLeft - slider.children[0].offsetLeft) : (slider.scrollWidth / multiplier);
    };

    setInterval(() => {
        if (!isHovered && !isDown) {
            slider.scrollLeft += speed;
        }

        // Salto invisible para efecto infinito verdadero
        const setWidth = getFirstSetWidth();
        if (slider.scrollLeft >= setWidth && setWidth > 0) {
            slider.scrollLeft -= setWidth;
        }
    }, 30);
};

async function loadSettings() {
    try {
        const { data, error } = await supabaseClient.from('settings').select('*').limit(1).single();
        if (data) {
            globalExchangeRate = data.exchange_rate;
            globalSettingsId = data.id;
            globalPaymentInfo = data.payment_info || { pago_movil: {}, binance: {} };
            globalSocialLinks = {
                facebook: data.social_facebook || '',
                instagram: data.social_instagram || '',
                tiktok: data.social_tiktok || ''
            };
            updateFooterLinks();
        }
    } catch(e) { console.error(e); }
}

async function loadProfile() {
    try {
        const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
        if (data) {
            currentProfile = data;
        } else {
            // Auto-migrar usuarios viejos o crear perfil si falló al registrarse por RLS
            const fullName = currentUser.user_metadata?.full_name || 'Usuario Antiguo';
            const userWhatsapp = currentUser.user_metadata?.whatsapp || 'Sin Número';
            await supabaseClient.from('profiles').insert([{ id: currentUser.id, full_name: fullName, whatsapp: userWhatsapp, email: currentUser.email }]);
            const { data: newData } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
            currentProfile = newData;

            // Procesar código de referido si existe
            const usedReferral = currentUser.user_metadata?.referral;
            if (usedReferral) {
                await supabaseClient.rpc('apply_referral_code', {
                    p_target_user_id: currentUser.id,
                    p_referral_code: usedReferral
                });
                // Recargar el perfil por si subió a especial
                const { data: refData } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
                currentProfile = refData;
            }
        }
    } catch(e) { console.error(e); }
}

function updateNavbar() {
    const btn = document.getElementById('btn-login');
    if (!btn) return;
    if (currentUser) {
        btn.textContent = "Mi Cuenta";
        btn.onclick = () => navigateTo('/login');
    } else {
        btn.textContent = "Iniciar Sesión";
        btn.onclick = () => navigateTo('/login');
    }
}

// ==========================================
// 4. VISTAS PRINCIPALES (HOME & CATALOG)
// ==========================================
function updateFaviconAndLogo(logoUrl) {
    const logoContainer = document.querySelector('.logo');
    if (logoContainer && logoUrl) {
        logoContainer.innerHTML = `
            <img src="${logoUrl}" alt="Vortex Coins" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 10px;">
            <span class="logo-text">VORTEX COINS</span>
        `;
    }

    let link = document.getElementById('favicon-el');
    if (link && logoUrl) {
        link.href = logoUrl;
    }
}

async function renderHome() {
    appContainer.innerHTML = `
        <div style="text-align: center; padding: 20px 0; overflow-x: hidden; width: 100%;">
            <h1 class="home-title" style="font-family: var(--font-heading); margin-bottom: 10px;">
                ¿Qué deseas <span style="color: var(--cyan-neon); text-shadow: 0 0 10px rgba(0,255,255,0.2);">recargar</span> hoy?
            </h1>
            
            <!-- Carrusel de Ofertas -->
            <div id="offers-carousel-container" style="margin-bottom: 30px; overflow: hidden; width: 100%;"></div>

            <div class="categories-grid" id="categories-list">
                <div class="loader">Cargando categorías...</div>
            </div>

            <!-- SECCIÓN DE RESEÑAS -->
            <div class="reviews-section" id="home-reviews-section" style="overflow: hidden;">
                <h2 style="font-family: var(--font-heading); color: var(--gold); margin-bottom: 10px;">¿Qué dicen nuestros clientes?</h2>
                ${currentUser ? `<button class="btn btn-outline" style="margin-bottom: 20px;" onclick="openReviewModal()">Dejar una Opinión</button>` : `<p style="color:var(--text-muted); font-size: 0.9rem;">Inicia sesión para dejar tu reseña.</p>`}
                
                <div class="reviews-grid" id="home-reviews-grid">
                    <div class="loader">Cargando reseñas...</div>
                </div>
            </div>
        </div>
    `;
    document.title = "Vortex Coins | Inicio";

    loadHomeReviews();
    loadSpecialOffers(null); // Load global offers

    try {
        const { data: imgData } = await supabaseClient.from('ui_images').select('*');
        let uiImages = {};
        if (imgData) {
            imgData.forEach(img => uiImages[img.key] = img.url);
        }

        if (uiImages['logo']) {
            updateFaviconAndLogo(uiImages['logo']);
        }

        const categoriesList = document.getElementById('categories-list');
        if (categoriesList) {
            categoriesList.innerHTML = `
                <div class="category-card card-ff" onclick="navigateTo('/free-fire')" style="${uiImages['cat_free_fire'] ? `background-image: url(${uiImages['cat_free_fire']}); background-size: cover; background-position: center; border-color: #f59e0b; min-height: 140px;` : ''}">
                    ${uiImages['cat_free_fire'] ? '' : '<div class="category-icon">🔥</div>'}
                    <h3 class="category-title">Free Fire</h3>
                </div>
                <div class="category-card card-bs" onclick="navigateTo('/blood-strike')" style="${uiImages['cat_blood_strike'] ? `background-image: url(${uiImages['cat_blood_strike']}); background-size: cover; background-position: center; border-color: #ec4899; min-height: 140px;` : ''}">
                    ${uiImages['cat_blood_strike'] ? '' : '<div class="category-icon">🩸</div>'}
                    <h3 class="category-title">Blood Strike</h3>
                </div>
                <div class="category-card card-st" onclick="navigateTo('/streaming')" style="${uiImages['cat_streaming'] ? `background-image: url(${uiImages['cat_streaming']}); background-size: cover; background-position: center; border-color: #06b6d4; min-height: 140px;` : ''}">
                    ${uiImages['cat_streaming'] ? '' : '<div class="category-icon">🍿</div>'}
                    <h3 class="category-title">Streaming</h3>
                </div>
            `;
        }
    } catch (e) {
        console.error("Error al cargar imágenes de categorías", e);
    }
}

async function loadHomeReviews() {
    const grid = document.getElementById('home-reviews-grid');
    if(!grid) return;

    try {
        const { data, error } = await supabaseClient.from('reviews')
            .select('rating, comment, created_at, author_name')
            .order('created_at', { ascending: false })
            .limit(6);
        
        if (error) throw error;

        if (data.length === 0) {
            grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1;">Aún no hay reseñas. ¡Sé el primero!</p>`;
            return;
        }

        const reviewsHtml = data.map(r => `
            <div class="review-card" style="flex: 0 0 auto; width: 300px; text-align: left; user-select: none;">
                <div class="review-stars">${'⭐'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                <div class="review-author">${r.author_name || 'Usuario'}</div>
                <div class="review-text">"${r.comment}"</div>
                <div style="font-size: 0.7rem; color: #666; margin-top: 10px;">${new Date(r.created_at).toLocaleDateString()}</div>
            </div>
        `).join('');

        grid.innerHTML = `<div id="reviews-scroll-wrapper" class="no-scrollbar" style="display: flex; gap: 20px; overflow-x: auto; scrollbar-width: none; padding-bottom: 10px; cursor: grab;">${reviewsHtml}</div>`;
        
        setTimeout(() => setupDraggableAutoScroll('reviews-scroll-wrapper', 0.5), 100);

    } catch (e) {
        grid.innerHTML = `<p style="color:#ef4444;">Error cargando reseñas</p>`;
    }
}

async function renderCatalog(categoryKey, title, icon, accentColor) {
    appContainer.innerHTML = `
        <div>
            <div class="products-header">
                <h2 style="color: ${accentColor}; font-family: var(--font-heading); font-size: 2.2rem;">${icon} Catálogo: ${title}</h2>
                <button class="btn btn-outline" onclick="navigateTo('/')">Volver al Inicio</button>
            </div>
            <div id="offers-carousel-container" style="margin-bottom: 30px; text-align: center;"></div>
            <div class="products-grid" id="products-list"><div class="loader">Cargando catálogo...</div></div>
        </div>
    `;
    document.title = `${title} | Vortex Coins`;
    
    // Cargar ofertas especiales para esta categoría
    loadSpecialOffers(categoryKey);

    try {
        const [productsRes, imagesRes] = await Promise.all([
            supabaseClient.from('products').select('*').eq('category', categoryKey),
            supabaseClient.from('ui_images').select('*')
        ]);
        
        if (productsRes.error) throw productsRes.error;
        currentProducts = productsRes.data;

        let uiImages = {};
        if (imagesRes.data) {
            imagesRes.data.forEach(img => uiImages[img.key] = img.url);
        }

        const listContainer = document.getElementById('products-list');
        if (currentProducts.length === 0) {
            listContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align:center; color: var(--text-muted);">No hay productos aquí.</p>`;
            return;
        }

        // Agrupar por sub_category
        const subcategories = {};
        currentProducts.forEach(p => {
            const sc = p.sub_category || 'General';
            if (!subcategories[sc]) subcategories[sc] = [];
            subcategories[sc].push(p);
        });

        // Generar UI
        listContainer.innerHTML = Object.keys(subcategories).map(scName => {
            const keyFormat = `subcat_${scName.toLowerCase().replace(/ /g, '_').replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u')}`;
            const scImage = uiImages[keyFormat] || null;
            
            return `
            <div class="product-card" onclick="openSubcatModal('${scName}')" style="cursor: pointer; text-align: center;">
                ${scImage ? `<div style="text-align:center; margin-bottom:15px;"><img src="${scImage}" alt="${scName}" loading="lazy" style="max-width:100%; height:120px; object-fit:contain; border-radius:8px;"></div>` : '<div style="font-size: 3rem; margin-bottom:15px;">📦</div>'}
                <div class="product-name" style="font-size: 1.2rem; color: var(--gold);">${scName}</div>
                <div style="color: var(--text-muted); font-size: 0.9rem; margin-top: 5px;">Haga clic para ver opciones</div>
            </div>`;
        }).join('');

        // Exponer función para abrir el modal
        window.openSubcatModal = function(scName) {
            const products = subcategories[scName];
            const modalTitle = document.getElementById('subcat-modal-title');
            const modalList = document.getElementById('subcat-products-list');
            
            modalTitle.textContent = `Opciones: ${scName}`;
            
            const tier = currentProfile ? currentProfile.tier : 'cliente';
            const priceCol = `price_usdt_${tier}`;
            
            const keyFormat = `subcat_${scName.toLowerCase().replace(/ /g, '_').replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u')}`;
            const fallbackImage = uiImages[keyFormat];

            modalList.innerHTML = products.sort((a,b) => a[priceCol] - b[priceCol]).map(product => {
                const priceUsdt = product[priceCol] || 0;
                const priceBs = priceUsdt * globalExchangeRate;
                const imgToShow = product.image_url || fallbackImage;
                
                return `
                <div class="product-card" onclick="closeSubcatModal(); openCheckoutModal('${product.id}')" style="margin-bottom: 0;">
                    ${imgToShow ? `<div style="text-align:center; margin-bottom:15px;"><img src="${imgToShow}" alt="${product.name}" loading="lazy" style="max-width:100%; height:100px; object-fit:contain; border-radius:8px;"></div>` : ''}
                    <div class="product-name" style="font-size: 1rem;">${product.name}</div>
                    <div style="margin-top: 10px;">
                        <div class="product-price-bs" style="font-size: 1.2rem; color: var(--gold); font-weight: bold;">${formatPrice(priceUsdt)}</div>
                    </div>
                </div>`;
            }).join('');
            
            document.getElementById('subcategory-modal-overlay').classList.add('active');
        };

        window.closeSubcatModal = function() {
            document.getElementById('subcategory-modal-overlay').classList.remove('active');
        };

    } catch (e) {
        document.getElementById('products-list').innerHTML = `<p style="color: #ef4444; text-align:center;">Error: ${e.message}</p>`;
    }
}

// ==========================================
// 5. MI CUENTA (DASHBOARD) O LOGIN
// ==========================================
async function renderDashboardOrLogin() {
    document.title = "Mi Cuenta | Vortex Coins";
    
    if (currentUser && currentProfile) {
        // Render Dashboard
        appContainer.innerHTML = `
            <div class="dashboard-grid">
                <!-- Sidebar Perfil -->
                <div class="dashboard-card" style="align-self: start;">
                    <h3 style="color: var(--cyan-neon); font-family: var(--font-heading); margin-bottom: 20px;">Mi Perfil</h3>
                    <p style="color: var(--text-muted); font-size: 13px;">Nombre:</p>
                    <p style="margin-bottom: 10px; font-weight: 600;">${currentProfile.full_name}</p>
                    <p style="color: var(--text-muted); font-size: 13px;">WhatsApp:</p>
                    <p style="margin-bottom: 10px;">${currentProfile.whatsapp}</p>
                    <p style="color: var(--text-muted); font-size: 13px;">Rango:</p>
                    <p style="margin-bottom: 10px; color: var(--gold); text-transform: uppercase; font-weight:bold;">${currentProfile.tier}</p>
                    <p style="color: var(--text-muted); font-size: 13px;">Tu Código de Referido:</p>
                    <div style="display:flex; gap:10px; margin-bottom: 20px;">
                        <input type="text" readonly value="${currentProfile.referral_code || 'Generando...'}" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--cyan-neon); color: var(--cyan-neon); padding: 5px 10px; border-radius: 4px; text-align: center; font-weight: bold;">
                    </div>
                    
                    <button class="btn btn-outline" style="width: 100%; border-color: var(--cyan-neon); color: var(--cyan-neon); margin-bottom: 10px;" onclick="openProfileModal()">✏️ Editar Perfil</button>
                    <button class="btn btn-outline" style="width: 100%; border-color: #ef4444; color: #ef4444;" onclick="logout()">Cerrar Sesión</button>
                    ${currentProfile.role === 'admin' ? `
                    <button class="btn" style="width: 100%; background: var(--cyan-neon); color: var(--bg-dark); margin-top: 15px;" onclick="navigateTo('/admin')">🔧 Panel Admin</button>
                    ` : ''}
                </div>

                <!-- Main Area: Billetera y Pedidos -->
                <div>
                    <!-- Billetera -->
                    <div class="dashboard-card" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <p style="color: var(--text-muted); font-size: 14px;">Saldo Disponible (Billetera)</p>
                            <h2 style="font-size: 2.5rem; color: var(--cyan-neon); font-family: var(--font-heading); line-height: 1;">${Number(currentProfile.balance).toFixed(2)} <span style="font-size: 1.2rem; color: var(--text-muted);">USDT</span></h2>
                        </div>
                        <button class="btn btn-outline" onclick="openDepositModal()" style="font-size: 16px; padding: 12px 25px;">➕ Recargar Saldo</button>
                    </div>

                    <!-- Historial -->
                    <div class="dashboard-card">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="font-family: var(--font-heading); margin: 0;">Mis Pedidos</h3>
                            <button class="btn btn-outline" onclick="openUserOrdersModal()" style="font-size: 12px; padding: 8px 15px;">Ver Historial</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- USER ORDERS MODAL OVERLAY -->
            <div class="modal-overlay" id="user-orders-modal-overlay">
                <div class="checkout-modal" style="width: 95%; max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column; padding: 0;">
                    <div class="modal-header" style="padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: var(--bg-surface); border-radius: 12px 12px 0 0;">
                        <h3 style="font-family: var(--font-heading); color: var(--gold); margin: 0;">📦 Mis Pedidos</h3>
                        <button class="modal-close" onclick="closeUserOrdersModal()" style="margin:0;">&times;</button>
                    </div>
                    <div id="user-orders-container" style="overflow-y: auto; overflow-x: hidden; flex-grow: 1; padding: 20px; background: var(--bg-dark); border-radius: 0 0 12px 12px;">
                        <div class="loader">Cargando historial...</div>
                    </div>
                </div>
            </div>
        `;

        window.openUserOrdersModal = function() {
            document.getElementById('user-orders-modal-overlay').classList.add('active');
            loadUserOrders();
        };

        window.closeUserOrdersModal = function() {
            document.getElementById('user-orders-modal-overlay').classList.remove('active');
        };
    } else {
        // Render Login/Register
        appContainer.innerHTML = `
            <div style="max-width: 450px; margin: 40px auto; background: var(--bg-surface); padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
                    <h3 id="tab-login" style="cursor:pointer; color: var(--cyan-neon);" onclick="switchAuthTab('login')">Iniciar Sesión</h3>
                    <h3 id="tab-register" style="cursor:pointer; color: var(--text-muted);" onclick="switchAuthTab('register')">Registrarse</h3>
                </div>
                
                <form id="auth-form">
                    <div id="register-fields" style="display:none;">
                        <div class="form-group">
                            <label class="form-label">Nombre Completo</label>
                            <input type="text" id="auth-name" class="form-input" placeholder="Tu nombre">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Número de WhatsApp (Con código de país, ej: +58)</label>
                            <input type="text" id="auth-whatsapp" class="form-input" placeholder="Ej: +584120000000">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Código de Referido (Opcional)</label>
                            <input type="text" id="auth-referral" class="form-input" placeholder="Si tienes un código de invitado">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Correo Electrónico</label>
                        <input type="email" id="auth-email" class="form-input" required placeholder="ejemplo@correo.com">
                    </div>
                    <div class="form-group" style="margin-bottom: 10px;">
                        <label class="form-label">Contraseña</label>
                        <input type="password" id="auth-password" class="form-input" required placeholder="Tu contraseña">
                    </div>
                    
                    <!-- Turnstile Widget -->
                    <div class="cf-turnstile" data-sitekey="1x00000000000000000000AA" data-theme="dark" style="margin-bottom: 15px; display: flex; justify-content: center;"></div>
                    
                    <div style="text-align:right; margin-bottom: 20px;">
                        <a href="javascript:resetPassword()" style="font-size:12px; color:var(--text-muted); text-decoration:underline;">¿Olvidaste tu contraseña?</a>
                    </div>
                    <button type="submit" class="btn btn-outline" style="width: 100%;" id="btn-auth-submit">Ingresar</button>
                </form>
                <div id="auth-error" style="color: #ef4444; font-size: 13px; margin-top: 15px; text-align:center;"></div>
            </div>
        `;
        
        document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
    }
}

let currentAuthMode = 'login';
window.switchAuthTab = function(mode) {
    currentAuthMode = mode;
    document.getElementById('tab-login').style.color = mode === 'login' ? 'var(--cyan-neon)' : 'var(--text-muted)';
    document.getElementById('tab-register').style.color = mode === 'register' ? 'var(--cyan-neon)' : 'var(--text-muted)';
    document.getElementById('register-fields').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('btn-auth-submit').textContent = mode === 'login' ? 'Ingresar' : 'Crear Cuenta';
};

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = "";

    try {
        if (currentAuthMode === 'login') {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) errorDiv.textContent = "Error: " + error.message;
        } else {
            const name = document.getElementById('auth-name').value;
            const whatsapp = document.getElementById('auth-whatsapp').value.trim();
            const referral = document.getElementById('auth-referral').value.trim();
            
            if (!name || !whatsapp) {
                errorDiv.textContent = "Debes llenar todos los campos (Nombre y WhatsApp).";
                return;
            }

            if (!/^\+\d{10,15}$/.test(whatsapp)) {
                errorDiv.textContent = "El número de WhatsApp debe incluir el código de país y empezar con '+' (Ej: +58412...).";
                return;
            }
            
            errorDiv.textContent = "Registrando...";
            const { data, error } = await supabaseClient.auth.signUp({ 
                email, 
                password,
                options: {
                    data: {
                        full_name: name,
                        whatsapp: whatsapp,
                        referral: referral
                    }
                }
            });
            
            if (error) {
                errorDiv.textContent = "Error: " + error.message;
            } else if (data.user) {
                // Insertar perfil (podría fallar si se requiere confirmación de email y el RLS bloquea)
                // Por eso guardamos los datos en user_metadata arriba. Si falla, loadProfile los recuperará al iniciar sesión.
                const { error: upsertError } = await supabaseClient.from('profiles').upsert([{
                    id: data.user.id,
                    full_name: name,
                    whatsapp: whatsapp,
                    email: email
                }]);
                
                errorDiv.style.color = "var(--cyan-neon)";
                if (upsertError) {
                    errorDiv.textContent = "¡Registro exitoso! Confirma tu correo para iniciar sesión.";
                } else {
                    errorDiv.textContent = "¡Registro exitoso! Redirigiendo a la tienda...";
                    setTimeout(() => {
                        window.location.hash = '#/';
                    }, 1000);
                }
            }
        }
    } catch (err) {
        errorDiv.textContent = "Error inesperado: " + err.message;
    }
}

window.resetPassword = async function() {
    const email = document.getElementById('auth-email').value;
    if (!email) {
        alert("Por favor ingresa tu correo en el campo de arriba para enviarte el enlace de recuperación.");
        return;
    }
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
    if (error) alert("Error: " + error.message);
    else alert("Revisa tu correo. Te hemos enviado un enlace para cambiar tu contraseña.");
};

window.logout = async function() {
    await supabaseClient.auth.signOut();
    router();
};

async function loadUserOrders(filterDate = null) {
    const container = document.getElementById('user-orders-container');
    
    if (!filterDate) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        filterDate = `${yyyy}-${mm}-${dd}`;
    }

    let startOfDay, endOfDay;
    try {
        const parts = filterDate.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        startOfDay = new Date(year, month, day, 0, 0, 0).toISOString();
        endOfDay = new Date(year, month, day, 23, 59, 59, 999).toISOString();
    } catch(e) {
        startOfDay = new Date().toISOString();
        endOfDay = new Date().toISOString();
    }

    const { data, error } = await supabaseClient.from('orders')
        .select('*, products(name)')
        .eq('user_id', currentUser.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

    const filterHtml = `
        <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <label style="color: var(--text-muted); font-weight: bold;">📅 Filtrar por fecha:</label>
            <input type="date" class="form-input" style="width: 200px; padding: 8px 12px;" value="${filterDate}" onchange="loadUserOrders(this.value)">
        </div>
    `;

    if (error || !data || !data.length) {
        container.innerHTML = filterHtml + `<p style="color:var(--text-muted); padding:10px;">Aún no tienes pedidos para la fecha seleccionada (${filterDate}).</p>`;
        return;
    }

    container.innerHTML = filterHtml + `
        <table class="data-table">
            <thead><tr><th>Fecha</th><th>Producto</th><th>Pago</th><th>Estado</th></tr></thead>
            <tbody>
                ${data.map(order => `
                    <tr>
                        <td data-label="Fecha">${new Date(order.created_at).toLocaleDateString()}</td>
                        <td data-label="Producto">${order.products?.name || order.order_data?.['[OFERTA]'] || 'Producto eliminado'}</td>
                        <td data-label="Pago">${order.amount_paid} ${order.currency}</td>
                        <td data-label="Estado">
                            <span class="badge badge-${order.status}">${order.status.replace('_', ' ')}</span>
                            ${order.order_data && Object.keys(order.order_data).length > 0 ? `
                                <div style="margin-top: 10px; font-size: 12px; line-height: 1.5; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                                    <strong style="color:var(--cyan-neon); display:block; margin-bottom:5px;">Detalles del Pedido:</strong>
                                    ${Object.entries(order.order_data).map(([k, v]) => {
                                        let color = 'var(--gold)';
                                        if (k === 'Motivo de Rechazo') color = '#ef4444';
                                        if (k === '[ENTREGA]') color = '#10b981';
                                        return `<strong style="color:${color};">${k}:</strong> ${v}`;
                                    }).join('<br>')}
                                </div>
                            ` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ==========================================
// 6. FLUJO DE DEPÓSITO (RECARGA DE BILLETERA)
// ==========================================
const depositOverlay = document.getElementById('deposit-modal-overlay');

window.openDepositModal = function() {
    depositOverlay.classList.add('active');
    document.getElementById('deposit-form').reset();
    selectDepositMethod('binance');
};

window.closeDepositModal = function() {
    depositOverlay.classList.remove('active');
};

window.selectDepositMethod = function(method) {
    document.getElementById('deposit-selected-method').value = method;
    document.getElementById('deposit-currency').value = method === 'pago_movil' ? 'BS' : 'USDT';
    
    const pagoMovilBtn = document.getElementById('dep-method-pago-movil');
    if (pagoMovilBtn) pagoMovilBtn.classList.toggle('selected', method === 'pago_movil');
    
    document.getElementById('dep-method-binance').classList.toggle('selected', method === 'binance');
    
    const pagoMovilInfo = document.getElementById('dep-info-pago-movil');
    if (pagoMovilInfo) pagoMovilInfo.style.display = method === 'pago_movil' ? 'block' : 'none';
    
    document.getElementById('dep-info-binance').style.display = method === 'binance' ? 'block' : 'none';
    calculateDeposit();
};

window.calculateDeposit = function() {
    const amountUsdt = parseFloat(document.getElementById('deposit-amount-usdt').value) || 0;
    const currency = document.getElementById('deposit-currency').value;
    const totalDisplay = document.getElementById('deposit-total-price');
    
    if (currency === 'BS') {
        const totalBs = amountUsdt * globalExchangeRate;
        totalDisplay.textContent = `${totalBs.toLocaleString('es-VE')} Bs`;
    } else {
        totalDisplay.textContent = `${amountUsdt.toFixed(2)} USDT`;
    }
};

document.getElementById('deposit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const amountUsdt = parseFloat(document.getElementById('deposit-amount-usdt').value);
    if (amountUsdt < 2) {
        alert("El depósito mínimo es 2 USDT.");
        return;
    }
    
    if (!depositSelectedFile) {
        alert("Sube el capture de pago.");
        return;
    }

    const btn = document.getElementById('btn-submit-deposit');
    btn.disabled = true;
    btn.textContent = "Reportando depósito...";

    try {
        const fileExt = depositSelectedFile.name.split('.').pop();
        const fileName = `deposit-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage.from('payment_proofs').upload(filePath, depositSelectedFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseClient.storage.from('payment_proofs').getPublicUrl(filePath);

        const currency = document.getElementById('deposit-currency').value;
        const amountPaid = currency === 'BS' ? (amountUsdt * globalExchangeRate) : amountUsdt;
        const method = document.getElementById('deposit-selected-method').value;
        const ref = document.getElementById('deposit-reference').value;

        const { error: dbError } = await supabaseClient.from('deposits').insert({
            user_id: currentUser.id,
            amount_usdt: amountUsdt,
            amount_paid: amountPaid,
            currency: currency,
            payment_method: method,
            payment_reference: ref,
            payment_proof_url: publicUrl,
            status: 'pending'
        });

        if (dbError) throw dbError;
        alert("Depósito reportado exitosamente. Un administrador lo aprobará pronto para acreditar tu saldo.");
        closeDepositModal();

    } catch(e) {
        alert("Error al reportar depósito: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Reportar Depósito";
    }
});


// ==========================================
// 7. FLUJO DE CHECKOUT (COMPRAR PRODUCTO)
// ==========================================
const checkoutOverlay = document.getElementById('checkout-modal-overlay');

window.openPromoCheckout = function(offerId) {
    const offer = specialOffersData.find(o => o.id === offerId);
    if (!offer) return;

    let reqFields = offer.required_fields || [];

    const mockedProduct = {
        id: offer.id,
        name: `(OFERTA) ${offer.title}`,
        price_usdt_cliente: offer.price_usdt,
        price_usdt_revendedor: offer.price_usdt,
        price_usdt_mayorista: offer.price_usdt,
        required_fields: reqFields,
        note: offer.note,
        is_promo: true
    };

    const existingIndex = currentProducts.findIndex(p => p.id === offer.id);
    if (existingIndex === -1) {
        currentProducts.push(mockedProduct);
    } else {
        currentProducts[existingIndex] = mockedProduct;
    }

    window.openCheckoutModal(offer.id);
};

window.openCheckoutModal = function(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;

    // Mostrar u ocultar campos de invitado
    const guestFields = document.getElementById('guest-checkout-fields');
    if (!currentUser) {
        if(guestFields) guestFields.style.display = 'block';
    } else {
        if(guestFields) guestFields.style.display = 'none';
    }

    document.getElementById('selected-product-id').value = productId;
    document.getElementById('modal-product-name').textContent = `Comprar: ${product.name}`;
    
    // Calcular precio
    const tier = currentProfile ? currentProfile.tier : 'cliente';
    const priceCol = `price_usdt_${tier}`;
    const priceUsdt = product[priceCol] || 0;
    document.getElementById('product-price-usdt').value = priceUsdt;
    
    // Inyectar nota si existe
    let noteHtml = '';
    if (product.note) {
        noteHtml = `<div style="background: rgba(251, 191, 36, 0.1); border: 1px solid var(--gold); border-radius: 8px; padding: 10px; margin-bottom: 15px;">
            <span style="color: var(--gold); font-weight: bold; font-size: 12px; display: block; margin-bottom: 3px;">📌 Nota de la Oferta:</span>
            <p style="color: #fff; font-size: 13px; margin: 0; line-height: 1.4;">${product.note}</p>
        </div>`;
    }

    // Inyectar inputs dinámicos
    const inputsContainer = document.getElementById('dynamic-inputs-container');
    inputsContainer.innerHTML = noteHtml + product.required_fields.map(field => `
        <div class="form-group">
            <label class="form-label">${field.label}</label>
            <input type="${field.type}" class="form-input dynamic-input" data-name="${field.name}" required placeholder="${field.placeholder || ''}">
        </div>
    `).join('');

    // Billetera (Saldo) logic
    const walletBalance = currentProfile ? (Number(currentProfile.balance) || 0) : 0;
    document.getElementById('current-wallet-balance').textContent = `${walletBalance.toFixed(2)} USDT`;
    
    const saldoCard = document.getElementById('method-saldo');
    if (currentUser && walletBalance >= priceUsdt) {
        saldoCard.style.display = 'block'; // Mostrar opción de saldo si tiene suficiente
    } else {
        saldoCard.style.display = 'none';
    }

    // Inyectar datos de pago si existen
    if (globalPaymentInfo) {
        if (globalPaymentInfo.pago_movil) {
            document.getElementById('bank-name').textContent = globalPaymentInfo.pago_movil.banco || '';
            document.getElementById('phone-num').textContent = globalPaymentInfo.pago_movil.telefono || '';
            document.getElementById('id-num').textContent = globalPaymentInfo.pago_movil.cedula || '';
        }
        if (globalPaymentInfo.binance) {
            document.getElementById('binance-id').textContent = globalPaymentInfo.binance.pay_id || '';
        }
    }

    // Autoseleccionar la moneda global
    selectCurrency(globalDisplayCurrency);
    checkoutOverlay.classList.add('active');
};

window.closeCheckoutModal = function() {
    checkoutOverlay.classList.remove('active');
};

window.selectCurrency = function(currency) {
    document.getElementById('selected-currency').value = currency;
    document.getElementById('btn-curr-bs').classList.toggle('active', currency === 'BS');
    document.getElementById('btn-curr-usdt').classList.toggle('active', currency === 'USDT');
    
    // Si la moneda cambia, ajustar el método de pago por defecto si no es saldo
    const currentMethod = document.getElementById('selected-payment-method').value;
    if (currentMethod !== 'saldo') {
        selectPaymentMethod(currency === 'BS' ? 'pago_movil' : 'binance');
    }
    
    updateCheckoutPriceDisplay();
};

window.selectPaymentMethod = function(method) {
    document.getElementById('selected-payment-method').value = method;
    
    document.getElementById('method-pago-movil').classList.toggle('selected', method === 'pago_movil');
    document.getElementById('method-binance').classList.toggle('selected', method === 'binance');
    document.getElementById('method-saldo').classList.toggle('selected', method === 'saldo');
    
    document.getElementById('info-pago-movil').style.display = method === 'pago_movil' ? 'block' : 'none';
    document.getElementById('info-binance').style.display = method === 'binance' ? 'block' : 'none';
    document.getElementById('info-saldo').style.display = method === 'saldo' ? 'block' : 'none';

    // Ocultar/Mostrar campos manuales (Capture y Referencia)
    const manualFields = document.getElementById('manual-payment-fields');
    if (method === 'saldo') {
        manualFields.style.display = 'none';
        document.getElementById('payment-reference').removeAttribute('required');
        document.getElementById('payment-file').removeAttribute('required');
    } else {
        manualFields.style.display = 'block';
        document.getElementById('payment-reference').setAttribute('required', 'true');
        document.getElementById('payment-file').setAttribute('required', 'true');
    }

    updateCheckoutPriceDisplay();
};

function updateCheckoutPriceDisplay() {
    const priceUsdt = parseFloat(document.getElementById('product-price-usdt').value);
    const currency = document.getElementById('selected-currency').value;
    const method = document.getElementById('selected-payment-method').value;
    const display = document.getElementById('modal-total-price');

    if (method === 'saldo') {
        display.textContent = `${priceUsdt.toFixed(2)} USDT (De tu saldo)`;
    } else if (currency === 'BS') {
        display.textContent = `${(priceUsdt * globalExchangeRate).toLocaleString('es-VE')} Bs`;
    } else {
        display.textContent = `${priceUsdt.toFixed(2)} USDT`;
    }
}

// Handler de archivos compartidos (Checkout o Deposit)
window.handleFileChange = function(event, labelId) {
    const file = event.target.files[0];
    if (file) {
        if (labelId === 'deposit-file-label') depositSelectedFile = file;
        else selectedFile = file;
        document.getElementById(labelId).innerHTML = `✅ Imagen: <strong style="color:var(--cyan-neon);">${file.name}</strong>`;
    }
};

document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-submit-order');
    btn.disabled = true;
    btn.textContent = "Procesando...";

    try {
        const productId = document.getElementById('selected-product-id').value;
        const product = currentProducts.find(p => p.id === productId);
        const isPromo = product?.is_promo;
        
        const method = document.getElementById('selected-payment-method').value;
        const currency = method === 'saldo' ? 'USDT' : document.getElementById('selected-currency').value;
        const priceUsdt = parseFloat(document.getElementById('product-price-usdt').value);
        const amountPaid = currency === 'BS' ? (priceUsdt * globalExchangeRate) : priceUsdt;

        let publicUrl = null;
        let reference = null;
        let guestWhatsapp = null;

        if (!currentUser) {
            guestWhatsapp = document.getElementById('guest-whatsapp').value;
            if (!guestWhatsapp) {
                btn.disabled = false;
                btn.textContent = "Confirmar Pago";
                throw new Error("El número de WhatsApp es obligatorio para invitados.");
            }
        }

        if (method !== 'saldo') {
            if (!selectedFile) throw new Error("Debes subir un capture.");
            reference = document.getElementById('payment-reference').value;

            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `order-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const uploadPath = currentUser ? `${currentUser.id}/${fileName}` : `guests/${fileName}`;
            
            const { error: uploadError } = await supabaseClient.storage.from('payment_proofs').upload(uploadPath, selectedFile);
            if (uploadError) throw uploadError;
            
            const { data } = supabaseClient.storage.from('payment_proofs').getPublicUrl(uploadPath);
            publicUrl = data.publicUrl;
        }

        // Datos del pedido
        const orderData = {};
        if (isPromo) {
            orderData['[OFERTA]'] = product.name;
            orderData['[PRECIO_USDT]'] = priceUsdt;
        }
        if (guestWhatsapp) {
            orderData['WhatsApp de Contacto'] = guestWhatsapp;
            const guestNameEl = document.getElementById('guest-name');
            if (guestNameEl && guestNameEl.value) orderData['Nombre Cliente'] = guestNameEl.value;
        }
        document.querySelectorAll('.dynamic-input').forEach(input => {
            orderData[input.getAttribute('data-name')] = input.value;
        });

        // Insertar Orden (Si es saldo, entra a processing directo y descuenta saldo)
        // OJO: Idealmente esto se hace con una función RPC (Procedimiento almacenado) para ser atómico,
        // pero por simplicidad haremos UPDATE al perfil aquí (El admin debería validarlo en un sistema real de alta concurrencia)
        
        let initialStatus = method === 'saldo' ? 'processing' : 'reviewing_payment';
        let assignedInventory = null;

        if (method === 'saldo') {
            // 1. Descontar Saldo
            const newBalance = Number(currentProfile.balance) - priceUsdt;
            if (newBalance < 0) throw new Error("Saldo insuficiente de forma repentina.");
            
            const { error: balError } = await supabaseClient.from('profiles').update({ balance: newBalance }).eq('id', currentUser.id);
            if (balError) throw balError;
            currentProfile.balance = newBalance; // Actualizar local

            // 2. Verificar si hay auto-entrega (Inventario) (Solo si no es promo)
            if (!isPromo) {
                const { data: invData } = await supabaseClient.from('product_inventory')
                    .select('*').eq('product_id', productId).eq('status', 'available').limit(1).single();
                
                if (invData) {
                    assignedInventory = invData;
                    initialStatus = 'completed'; // Se completa al instante
                    
                    // Mezclar los datos de la cuenta en los detalles del pedido para que el cliente los vea
                    Object.assign(orderData, invData.account_data);
                    orderData['[ENTREGA]'] = 'Automática ⚡';
                }
            }
        }

        // 3. Insertar la orden
        const insertPayload = {
            user_id: currentUser ? currentUser.id : null,
            status: initialStatus,
            order_data: orderData,
            payment_method: method,
            payment_reference: reference,
            payment_proof_url: publicUrl,
            amount_paid: amountPaid,
            currency: currency
        };
        // Solo incluir product_id si NO es una oferta especial
        if (!isPromo) {
            insertPayload.product_id = productId;
        }

        let query = supabaseClient.from('orders').insert(insertPayload);
        
        // Solo pedir que devuelva la fila si hay usuario logueado (necesario para RLS SELECT)
        if (currentUser) {
            query = query.select().single();
        }

        const { data: orderResult, error: orderError } = await query;

        if (orderError) throw orderError;

        // 4. Si hubo auto-entrega, marcar el inventario como vendido
        if (assignedInventory && orderResult && currentUser) {
            await supabaseClient.from('product_inventory')
                .update({ status: 'sold', order_id: orderResult.id })
                .eq('id', assignedInventory.id);
        }

        if (assignedInventory) {
            alert("¡Compra exitosa! Tu cuenta ha sido entregada automáticamente. Revisa los detalles en tu Historial de Pedidos.");
        } else if (method === 'saldo') {
            alert("¡Compra exitosa! Hemos descontado el saldo de tu billetera y el pedido se está procesando.");
        } else {
            alert(currentUser ? "¡Éxito! Tu reporte de pago ha sido enviado y está en revisión." : "¡Éxito! Tu reporte de pago ha sido enviado. Al ser invitado, te contactaremos por WhatsApp lo más pronto posible.");
        }
        
        closeCheckoutModal();
        if (window.location.hash === '#/login') loadUserOrders();

    } catch (e) {
        alert("Error al procesar la compra: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Confirmar Pago";
    }
});


// ==========================================
// 8. PANEL DE ADMINISTRADOR (ADMIN)
// ==========================================
async function renderAdmin() {
    document.title = "Panel Admin | Vortex Coins";
    if (!currentProfile || currentProfile.role !== 'admin') {
        appContainer.innerHTML = `<div style="text-align:center; margin-top:50px;"><h2 style="color:#ef4444;">Acceso Denegado</h2><p>No eres administrador.</p></div>`;
        return;
    }

    appContainer.innerHTML = `
        <div style="margin-bottom: 30px;">
            <h1 style="font-family:var(--font-heading); color:var(--cyan-neon);">Panel Administrativo</h1>
            <p style="color:var(--text-muted);">Gestiona ventas, clientes y configuraciones del ecosistema.</p>
        </div>
        
        <div style="position: relative; margin-bottom: 20px;">
            <button class="btn btn-outline" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 15px;" onclick="document.getElementById('admin-dropdown-menu').classList.toggle('active')">
                <span style="font-weight: bold; font-size: 16px;">☰ <span id="admin-menu-text">Menú Administrativo</span></span>
                <span style="font-size: 12px;">▼</span>
            </button>
            
            <div id="admin-dropdown-menu" class="admin-dropdown">
                <div class="admin-tab" id="tab-btn-orders" onclick="switchAdminTab('orders', '📦 Pedidos')">📦 Pedidos</div>
                <div class="admin-tab" id="tab-btn-products" onclick="switchAdminTab('products', '🛍️ Productos')">🛍️ Productos</div>
                <div class="admin-tab" id="tab-btn-design" onclick="switchAdminTab('design', '🎨 Diseño e Imágenes')">🎨 Diseño e Imágenes</div>
                <div class="admin-tab" id="tab-btn-deposits" onclick="switchAdminTab('deposits', '💰 Depósitos de Saldo')">💰 Depósitos de Saldo</div>
                <div class="admin-tab" id="tab-btn-clients" onclick="switchAdminTab('clients', '👥 Clientes y Rangos')">👥 Clientes y Rangos</div>
                <div class="admin-tab" id="tab-btn-promotions" onclick="switchAdminTab('promotions', '🎠 Promociones (Ofertas)')">🎠 Promociones (Ofertas)</div>
                <div class="admin-tab" id="tab-btn-inventory" onclick="switchAdminTab('inventory', '📦 Inventario (Carga de Stock)')">📦 Inventario (Carga de Stock)</div>
                <div class="admin-tab" id="tab-btn-alerts" onclick="switchAdminTab('alerts', '📢 Alertas')">📢 Alertas</div>
                <div class="admin-tab" id="tab-btn-settings" onclick="switchAdminTab('settings', '⚙️ Configuraciones')">⚙️ Configuraciones</div>
            </div>
        </div>
        
        <div id="admin-content-area" style="min-height: 400px; padding: 10px 0;">
            <div style="text-align:center; color: var(--text-muted); padding: 40px;">Seleccione una opción del menú superior.</div>
        </div>
    `;
}

window.switchAdminTab = function(tab, label = '') {
    try {
        Array.from(document.querySelectorAll('.admin-tab')).forEach(el => el.classList.remove('active'));
        document.getElementById('tab-btn-' + tab)?.classList.add('active');
        
        // Actualizar el texto del menú hamburguesa y cerrar el menú
        if (label) {
            document.getElementById('admin-menu-text').innerText = label;
        }
        document.getElementById('admin-dropdown-menu').classList.remove('active');
        
        const content = document.getElementById('admin-content-area');
        if (tab === 'orders') loadAdminOrders(content);
        else if (tab === 'products') loadAdminProducts(content);
        else if (tab === 'design') loadAdminDesign(content);
        else if (tab === 'deposits') loadAdminDeposits(content);
        else if (tab === 'clients') loadAdminClients(content);
        else if (tab === 'promotions') loadAdminPromotions(content);
        else if (tab === 'inventory') loadAdminInventory(content);
        else if (tab === 'alerts') loadAdminAlerts(content);
        else if (tab === 'settings') loadAdminSettings(content);
    } catch (e) {
        alert("Error al abrir pestaña: " + e.message);
    }
};

// === ADMIN: PEDIDOS ===
async function loadAdminOrders(container, filterDate = null) {
    container.innerHTML = `<div class="loader">Cargando pedidos...</div>`;
    
    // Auto-mantenimiento: Borrar pedidos más antiguos a 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await supabaseClient.from('orders').delete().lt('created_at', thirtyDaysAgo.toISOString());

    if (!filterDate) {
        // Fecha actual por defecto YYYY-MM-DD local
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        filterDate = `${yyyy}-${mm}-${dd}`;
    }

    let startOfDay, endOfDay;
    try {
        const parts = filterDate.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        startOfDay = new Date(year, month, day, 0, 0, 0).toISOString();
        endOfDay = new Date(year, month, day, 23, 59, 59, 999).toISOString();
    } catch(e) {
        startOfDay = new Date().toISOString();
        endOfDay = new Date().toISOString();
    }

    const { data, error } = await supabaseClient.from('orders')
        .select('*, profiles(full_name, whatsapp), products(name)')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

    const filterHtml = `
        <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <label style="color: var(--text-muted); font-weight: bold;">📅 Filtrar por fecha:</label>
            <input type="date" id="admin-orders-date" class="form-input" style="width: 200px; padding: 8px 12px;" value="${filterDate}" onchange="loadAdminOrders(document.getElementById('admin-content-area'), this.value)">
            <span style="font-size: 12px; color: var(--text-muted);">* Se eliminan los pedidos mayores a 30 días</span>
        </div>
    `;

    if (error || !data || !data.length) {
        container.innerHTML = filterHtml + `<div class="dashboard-card"><p>No hay pedidos en la fecha seleccionada (${filterDate}).</p></div>`;
        return;
    }

    container.innerHTML = filterHtml + `
        <div class="dashboard-card table-wrapper">
            <table class="data-table">
                <thead><tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Detalles</th><th>Pago</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                    ${data.map(order => `
                        <tr>
                            <td data-label="Fecha">${new Date(order.created_at).toLocaleString()}</td>
                            <td data-label="Cliente">
                                ${order.profiles?.full_name || order.order_data?.['Nombre Cliente'] || 'Invitado'}<br>
                                <small style="color:var(--text-muted)">
                                    ${order.profiles?.whatsapp || order.order_data?.['WhatsApp de Contacto'] || 'Sin número'} 
                                    ${(order.profiles?.whatsapp || order.order_data?.['WhatsApp de Contacto']) ? `<a href="https://wa.me/${(order.profiles?.whatsapp || order.order_data?.['WhatsApp de Contacto']).replace(/\D/g, '')}" target="_blank" style="text-decoration:none;" title="Chatear">💬</a>` : ''}
                                </small>
                            </td>
                            <td data-label="Producto">${order.products?.name || order.order_data?.['[OFERTA]'] || 'Oferta / Eliminado'}</td>
                            <td data-label="Detalles">
                                <div style="font-size:12px; line-height:1.5; background:rgba(255,255,255,0.02); padding:8px; border-radius:4px; border:1px solid rgba(255,255,255,0.05);">
                                    ${Object.entries(order.order_data || {}).map(([k, v]) => `<strong style="color:var(--gold);">${k}:</strong> ${v}`).join('<br>')}
                                </div>
                            </td>
                            <td data-label="Pago">${order.amount_paid} ${order.currency} (${order.payment_method})
                                ${order.payment_proof_url ? `<br><a href="${order.payment_proof_url}" target="_blank" style="color:var(--cyan-neon); text-decoration:underline;">Ver Capture</a>` : ''}
                            </td>
                            <td data-label="Estado"><span class="badge badge-${order.status}">${order.status}</span></td>
                            <td data-label="Acciones">
                                <select onchange="updateOrderStatus('${order.id}', this.value)" style="background:var(--bg-dark); color:white; padding:5px; border-radius:4px; margin-bottom: 5px; width: 100%;">
                                    <option value="" disabled selected>Cambiar Estado...</option>
                                    <option value="reviewing_payment">En Revisión</option>
                                    <option value="processing">Procesando</option>
                                    <option value="completed">Completado</option>
                                    <option value="rejected">Rechazado</option>
                                </select>
                                ${(() => {
                                    const rawPhone = order.profiles?.whatsapp || order.order_data?.['WhatsApp de Contacto'];
                                    if (!rawPhone) return '';
                                    const phone = rawPhone.replace(/\D/g, '');
                                    let dataStr = '';
                                    if (order.order_data) {
                                        dataStr = Object.entries(order.order_data).filter(([k,v]) => k !== 'Motivo de Rechazo' && k !== 'WhatsApp de Contacto' && k !== 'Nombre Cliente').map(([k, v]) => `${k}: ${v}`).join(', ');
                                    }
                                    const priceStr = `${order.amount_paid} ${order.currency}`;
                                    const prodName = order.products?.name || order.order_data?.['[OFERTA]'] || 'Oferta';
                                    
                                    if (order.status !== 'rejected') {
                                        const msg = `¡Hola! Tu pedido de ${prodName} ha sido procesado con éxito.\nPrecio: ${priceStr}\nDatos: ${dataStr}\n\n¡Gracias por preferir Vortex Coins!`;
                                        return `<a href="https://wa.me/${phone}?text=${encodeURIComponent(msg)}" target="_blank" class="btn btn-outline" style="padding: 3px 5px; font-size: 10px; display: block; text-align: center; margin-bottom: 5px; border-color: var(--cyan-neon); color: var(--cyan-neon);">💬 Notificar Éxito</a>`;
                                    } else {
                                        const motivo = order.order_data?.['Motivo de Rechazo'] ? '\nMotivo: ' + order.order_data['Motivo de Rechazo'] : '';
                                        const msg = `¡Hola! Tu pedido de ${prodName} ha sido rechazado.${motivo}\nPor favor comunícate con nosotros para más información.`;
                                        return `<a href="https://wa.me/${phone}?text=${encodeURIComponent(msg)}" target="_blank" class="btn btn-outline" style="padding: 3px 5px; font-size: 10px; display: block; text-align: center; color: #ef4444; border-color: #ef4444; margin-bottom: 5px;">💬 Notificar Rechazo</a>`;
                                    }
                                })()}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.updateOrderStatus = async function(orderId, newStatus) {
    if (!confirm(`¿Cambiar estado a ${newStatus}?`)) return;
    
    let updateData = { status: newStatus };
    
    if (newStatus === 'rejected') {
        const reason = prompt("Indica el motivo del rechazo (opcional, el cliente lo verá):");
        if (reason) {
            try {
                const { data: order } = await supabaseClient.from('orders').select('order_data').eq('id', orderId).single();
                let newOrderData = order.order_data || {};
                newOrderData['Motivo de Rechazo'] = reason;
                updateData.order_data = newOrderData;
            } catch(e) {}
        }
    }

    // Si se marca como completado, verificamos auto-entrega de inventario
    if (newStatus === 'completed') {
        try {
            const { data: order } = await supabaseClient.from('orders').select('*').eq('id', orderId).single();
            if (order && !order.order_data?.['[ENTREGA]']) {
                const { data: inv } = await supabaseClient.from('product_inventory').select('*').eq('product_id', order.product_id).eq('status', 'available').limit(1).single();
                if (inv) {
                    let newOrderData = Object.assign({}, order.order_data, inv.account_data);
                    newOrderData['[ENTREGA]'] = 'Automática ⚡';
                    
                    await supabaseClient.from('product_inventory').update({status: 'sold', order_id: orderId}).eq('id', inv.id);
                    await supabaseClient.from('orders').update({status: newStatus, order_data: newOrderData}).eq('id', orderId);
                    
                    alert("¡Inventario asignado automáticamente y orden completada!");
                    switchAdminTab('orders');
                    return;
                }
            }
        } catch(e) { console.error("Error en auto-entrega:", e); }
    }

    const { error } = await supabaseClient.from('orders').update(updateData).eq('id', orderId);
    if (error) alert("Error: " + error.message);
    else switchAdminTab('orders'); // Recargar
};

// === ADMIN: PRODUCTOS ===
async function loadAdminProducts(container) {
    container.innerHTML = `<div class="loader">Cargando productos...</div>`;
    const { data, error } = await supabaseClient.from('products').select('*').order('category', { ascending: true }).order('name', { ascending: true });

    if (error || !data.length) {
        container.innerHTML = `<p>No hay productos en el sistema.</p>`;
        return;
    }

    // Agrupar productos
    const grouped = {};
    data.forEach(p => {
        const cat = p.category || 'Sin Categoría';
        const sub = p.sub_category || 'General';
        if (!grouped[cat]) grouped[cat] = {};
        if (!grouped[cat][sub]) grouped[cat][sub] = [];
        grouped[cat][sub].push(p);
    });

    let html = `
        <div class="dashboard-card table-wrapper">
            <table class="data-table">
                <thead><tr><th>Producto</th><th>Subcategoría</th><th>URL / Subir Imagen</th><th>Proveedor</th><th>Cliente</th><th>Especial</th><th>Revendedor</th><th>Acciones</th></tr></thead>
                <tbody>
    `;

    for (const cat in grouped) {
        for (const sub in grouped[cat]) {
            html += `<tr style="background: rgba(0, 255, 255, 0.05);"><td colspan="8" style="font-weight:bold; color:var(--cyan-neon); text-transform:uppercase; text-align:left; padding:10px;">📦 Categoría: ${cat} &rsaquo; ${sub}</td></tr>`;
            grouped[cat][sub].forEach(p => {
                html += `
                    <tr id="row-prod-${p.id}">
                        <td data-label="Producto">${p.name}</td>
                        <td data-label="Subcategoría"><input type="text" id="subcat-${p.id}" value="${p.sub_category || ''}" placeholder="Ej: Pases" style="width:100%; min-width:100px; background:var(--bg-dark); color:white; border:1px solid #333; padding:5px; border-radius:4px;"></td>
                        <td data-label="URL / Subir Imagen">
                            <div style="display:flex; flex-direction:column; gap:5px;">
                                <input type="text" id="img-${p.id}" value="${p.image_url || ''}" placeholder="URL de la imagen" style="width:100%; min-width:120px; background:var(--bg-dark); color:white; border:1px solid #333; padding:5px; border-radius:4px;">
                                <input type="file" accept=".png, .jpg, .jpeg, .webp" onchange="uploadProductImage(event, '${p.id}')" style="font-size: 11px;">
                                <small id="img-status-${p.id}" style="color:var(--text-muted);"></small>
                            </div>
                        </td>
                        <td data-label="Proveedor"><input type="number" id="prov-${p.id}" value="${p.price_usdt_proveedor}" step="0.01" style="width:60px; background:var(--bg-dark); color:white; border:1px solid #333; padding:5px; border-radius:4px;"></td>
                        <td data-label="Cliente Normal"><input type="number" id="cli-${p.id}" value="${p.price_usdt_cliente}" step="0.01" style="width:60px; background:var(--bg-dark); color:white; border:1px solid #333; padding:5px; border-radius:4px;"></td>
                        <td data-label="Cliente Especial"><input type="number" id="esp-${p.id}" value="${p.price_usdt_especial}" step="0.01" style="width:60px; background:var(--bg-dark); color:white; border:1px solid #333; padding:5px; border-radius:4px;"></td>
                        <td data-label="Revendedor"><input type="number" id="rev-${p.id}" value="${p.price_usdt_revendedor}" step="0.01" style="width:60px; background:var(--bg-dark); color:white; border:1px solid #333; padding:5px; border-radius:4px;"></td>
                        <td data-label="Acciones">
                            <button class="btn btn-outline" onclick="saveAdminProduct('${p.id}')" style="padding:5px 10px; font-size:12px;">Guardar</button>
                        </td>
                    </tr>
                `;
            });
        }
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

window.saveAdminProduct = async function(id) {
    const btn = document.querySelector(`#row-prod-${id} button`);
    btn.textContent = "Guardando...";
    btn.disabled = true;

    const subcat = document.getElementById(`subcat-${id}`).value;
    const img = document.getElementById(`img-${id}`).value;
    const prov = parseFloat(document.getElementById(`prov-${id}`).value);
    const cli = parseFloat(document.getElementById(`cli-${id}`).value);
    const esp = parseFloat(document.getElementById(`esp-${id}`).value);
    const rev = parseFloat(document.getElementById(`rev-${id}`).value);

    const { error } = await supabaseClient.from('products').update({
        sub_category: subcat,
        image_url: img,
        price_usdt_proveedor: prov,
        price_usdt_cliente: cli,
        price_usdt_especial: esp,
        price_usdt_revendedor: rev
    }).eq('id', id);

    if (error) alert("Error: " + error.message);
    
    btn.textContent = "Guardar";
    btn.disabled = false;
    if(!error) {
        btn.textContent = "¡Guardado!";
        setTimeout(() => btn.textContent = "Guardar", 2000);
    }
};

window.uploadProductImage = async function(event, id) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById(`img-status-${id}`);
    const inputEl = document.getElementById(`img-${id}`);
    statusEl.textContent = "⏳ Subiendo...";
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `prod-${id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabaseClient.storage.from('site_images').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseClient.storage.from('site_images').getPublicUrl(fileName);
        
        inputEl.value = publicUrl;
        statusEl.textContent = "✅ Imagen subida (Recuerda Guardar)";
        statusEl.style.color = "var(--cyan-neon)";
        
    } catch (e) {
        statusEl.textContent = "❌ Error: " + e.message;
        statusEl.style.color = "#ef4444";
    }
};

// === ADMIN: DISEÑO E IMÁGENES ===
async function loadAdminDesign(container) {
    container.innerHTML = `<div class="loader">Cargando imágenes de diseño...</div>`;
    
    try {
        const [imagesRes, productsRes] = await Promise.all([
            supabaseClient.from('ui_images').select('*'),
            supabaseClient.from('products').select('category, sub_category')
        ]);
        
        if (imagesRes.error) throw imagesRes.error;
        if (productsRes.error) throw productsRes.error;
        
        let images = {};
        if (imagesRes.data) {
            imagesRes.data.forEach(img => images[img.key] = img.url);
        }

        const designSections = [
            { key: 'logo', title: 'Logo Principal del Sitio (Se recomienda 150x150)', type: 'logo' }
        ];

        // Categorías únicas
        const categories = [...new Set(productsRes.data?.map(p => p.category).filter(Boolean))];
        categories.forEach(cat => {
            const prettyName = cat.replace(/_/g, ' ').toUpperCase();
            designSections.push({
                key: `cat_${cat}`,
                title: `Portada Categoría: ${prettyName} (Se recomienda 600x300)`,
                type: 'banner'
            });
        });

        // Subcategorías únicas
        const subcategories = [...new Set(productsRes.data?.map(p => p.sub_category).filter(Boolean))];
        subcategories.forEach(sub => {
            const key = `subcat_${sub.toLowerCase().replace(/\s+/g, '_')}`;
            designSections.push({
                key: key,
                title: `Ícono Subcategoría: ${sub} (Se recomienda 200x200)`,
                type: 'icon'
            });
        });

        container.innerHTML = `
            <div class="dashboard-card" style="max-width: 800px;">
                <h2 style="font-family: var(--font-heading); color: var(--gold); margin-bottom: 20px;">Gestor de Imágenes del Sitio</h2>
                <p style="color: var(--text-muted); margin-bottom: 20px;">Sube archivos PNG, JPG o WEBP. El sistema se encargará de guardarlos y actualizar el sitio en tiempo real.</p>
                
                ${designSections.map(sec => `
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center; gap: 20px;">
                        <div style="width: 100px; height: 100px; background: #000; border-radius: ${sec.type === 'logo' ? '50%' : '8px'}; overflow: hidden; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                            ${images[sec.key] ? `<img src="${images[sec.key]}" style="width: 100%; height: 100%; object-fit: contain;">` : '<span style="color:#555;">Vacío</span>'}
                        </div>
                        <div style="flex: 1;">
                            <h4 style="margin-bottom: 10px;">${sec.title}</h4>
                            <div class="file-upload-wrapper">
                                <input type="file" id="upload-${sec.key}" class="file-upload-input" accept=".png, .jpg, .jpeg, .webp" onchange="handleImageUpload(event, '${sec.key}')">
                                <div class="file-upload-text" id="label-${sec.key}">
                                    📁 Haz clic o arrastra una imagen aquí
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch(e) {
        container.innerHTML = `<p style="color:#ef4444;">Error: ${e.message}</p>`;
    }
}

window.handleImageUpload = async function(event, key) {
    const file = event.target.files[0];
    if (!file) return;

    const label = document.getElementById(`label-${key}`);
    const originalText = label.innerHTML;
    label.innerHTML = "⏳ Subiendo...";
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${key}-${Date.now()}.${fileExt}`;
        
        // 1. Upload to storage
        const { error: uploadError } = await supabaseClient.storage.from('site_images').upload(fileName, file);
        if (uploadError) throw uploadError;

        // 2. Get public URL
        const { data: { publicUrl } } = supabaseClient.storage.from('site_images').getPublicUrl(fileName);

        // 3. Save to ui_images table
        const { error: dbError } = await supabaseClient.from('ui_images').upsert({ key: key, url: publicUrl });
        if (dbError) throw dbError;

        alert("¡Imagen actualizada correctamente!");
        const content = document.getElementById('admin-content-area');
        loadAdminDesign(content); // Reload view

    } catch (e) {
        alert("Error al subir imagen: " + e.message);
        label.innerHTML = originalText;
    }
};

// === ADMIN: DEPÓSITOS ===
async function loadAdminDeposits(container) {
    container.innerHTML = `<div class="loader">Cargando depósitos...</div>`;
    const { data, error } = await supabaseClient.from('deposits')
        .select('*, profiles(full_name, whatsapp)')
        .order('created_at', { ascending: false });

    if (error || !data.length) {
        container.innerHTML = `<p>No hay depósitos registrados.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="dashboard-card table-wrapper">
            <table class="data-table">
                <thead><tr><th>Fecha</th><th>Cliente</th><th>Pagó</th><th>Recarga (USDT)</th><th>Capture</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                    ${data.map(dep => `
                        <tr>
                            <td>${new Date(dep.created_at).toLocaleString()}</td>
                            <td>${dep.profiles?.full_name}</td>
                            <td>${dep.amount_paid} ${dep.currency} (${dep.payment_method})<br><small>Ref: ${dep.payment_reference}</small></td>
                            <td style="color:var(--gold); font-weight:bold;">+${dep.amount_usdt} USDT</td>
                            <td><a href="${dep.payment_proof_url}" target="_blank" style="color:var(--cyan-neon); text-decoration:underline;">Ver Capture</a></td>
                            <td><span class="badge badge-${dep.status}">${dep.status}</span></td>
                            <td>
                                ${dep.status === 'pending' ? `
                                    <button onclick="approveDeposit('${dep.id}', '${dep.user_id}', ${dep.amount_usdt})" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Aprobar</button>
                                    <button onclick="rejectDeposit('${dep.id}')" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Rechazar</button>
                                ` : 'Procesado'}
                                
                                ${dep.profiles?.whatsapp && dep.status === 'approved' ? `
                                    <a href="https://wa.me/${dep.profiles.whatsapp.replace(/\\D/g, '')}?text=${encodeURIComponent(`¡Hola! Tu recarga de ${dep.amount_usdt} USDT ha sido aprobada con éxito. Ya puedes usar tu saldo en Vortex Coins.`)}" target="_blank" class="btn btn-outline" style="padding: 3px 5px; font-size: 10px; display: block; text-align: center; margin-top: 5px;">💬 Notificar Éxito</a>
                                ` : ''}
                                ${dep.profiles?.whatsapp && dep.status === 'rejected' ? `
                                    <a href="https://wa.me/${dep.profiles.whatsapp.replace(/\\D/g, '')}?text=${encodeURIComponent(`¡Hola! Lamentablemente tu recarga de ${dep.amount_usdt} USDT ha sido rechazada. Por favor verifica los datos o comunícate con soporte.`)}" target="_blank" class="btn btn-outline" style="padding: 3px 5px; font-size: 10px; display: block; text-align: center; color: #ef4444; border-color: #ef4444; margin-top: 5px;">💬 Notificar Rechazo</a>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.approveDeposit = async function(depositId, userId, amountUsdt) {
    if (!confirm(`¿Aprobar y agregar ${amountUsdt} USDT al cliente?`)) return;
    
    // 1. Obtener saldo actual del cliente
    const { data: profile } = await supabaseClient.from('profiles').select('balance').eq('id', userId).single();
    const newBalance = Number(profile.balance) + Number(amountUsdt);
    
    // 2. Actualizar perfil y depósito (Idealmente esto es RPC atómico)
    await supabaseClient.from('profiles').update({ balance: newBalance }).eq('id', userId);
    await supabaseClient.from('deposits').update({ status: 'approved' }).eq('id', depositId);
    
    alert("¡Depósito aprobado y saldo agregado!");
    switchAdminTab('deposits');
};

window.rejectDeposit = async function(depositId) {
    if (!confirm("¿Rechazar este depósito?")) return;
    await supabaseClient.from('deposits').update({ status: 'rejected' }).eq('id', depositId);
    switchAdminTab('deposits');
};

window.adminClientsData = [];

async function loadAdminClients(container) {
    container.innerHTML = `<div class="loader">Cargando clientes...</div>`;
    const { data, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });

    if (error || !data.length) {
        container.innerHTML = `<p>No hay clientes.</p>`;
        return;
    }

    window.adminClientsData = data;

    container.innerHTML = `
        <div style="margin-bottom: 20px; position: relative; max-width: 400px;">
            <span style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); opacity: 0.5;">🔍</span>
            <input type="text" id="admin-search-clients" placeholder="Buscar por nombre, correo o número..." style="width: 100%; padding: 12px 12px 12px 40px; border-radius: 8px; background: var(--bg-dark); border: 1px solid rgba(255,255,255,0.1); color: white; outline: none; transition: 0.3s;" onfocus="this.style.borderColor='var(--cyan-neon)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'" oninput="filterAdminClients(this.value)">
        </div>
        <div class="dashboard-card table-wrapper">
            <table class="data-table">
                <thead><tr><th>Nombre y Correo</th><th>WhatsApp</th><th>Saldo (USDT)</th><th>Rol de Sistema</th><th>Nivel de Precios</th><th>Acciones</th></tr></thead>
                <tbody id="admin-clients-tbody">
                    ${renderAdminClientsRows(data)}
                </tbody>
            </table>
        </div>
    `;
}

window.renderAdminClientsRows = function(dataArray) {
    if(dataArray.length === 0) return `<tr><td colspan="6" style="text-align:center;">No se encontraron resultados</td></tr>`;
    return dataArray.map(client => `
        <tr>
            <td>${client.full_name || ''}<br><small style="color:var(--text-muted);">${client.email || 'Sin correo'}</small></td>
            <td>
                ${client.whatsapp || ''} 
                ${client.whatsapp ? `<a href="https://wa.me/${client.whatsapp.replace(/\\D/g, '')}" target="_blank" style="text-decoration:none;" title="Escribir">💬</a>` : ''}
            </td>
            <td style="color:var(--cyan-neon); font-weight:bold;">${Number(client.balance || 0).toFixed(2)}</td>
            <td>
                <select onchange="updateUserRole('${client.id}', this.value)" style="background:var(--bg-dark); color:${client.role === 'admin' ? '#ef4444' : 'white'}; padding:5px; border-radius:4px; font-weight:bold;">
                    <option value="client" ${client.role === 'client' ? 'selected' : ''}>Cliente</option>
                    <option value="admin" ${client.role === 'admin' ? 'selected' : ''}>Administrador</option>
                </select>
            </td>
            <td>
                <select onchange="updateUserTier('${client.id}', this.value)" style="background:var(--bg-dark); color:var(--gold); padding:5px; border-radius:4px;">
                    <option value="proveedor" ${client.tier === 'proveedor' ? 'selected' : ''}>Proveedor</option>
                    <option value="cliente" ${client.tier === 'cliente' ? 'selected' : ''}>Cliente</option>
                    <option value="especial" ${client.tier === 'especial' ? 'selected' : ''}>Cliente Especial</option>
                    <option value="revendedor" ${client.tier === 'revendedor' ? 'selected' : ''}>Revendedor</option>
                </select>
            </td>
            <td>
                <button class="btn btn-outline" style="padding: 5px 10px; font-size:12px; border-color: var(--gold); color: var(--gold);" onclick="adminChangeUserPassword('${client.id}')">🔑 Clave</button>
            </td>
        </tr>
    `).join('');
};

window.filterAdminClients = function(query) {
    if (!query) {
        document.getElementById('admin-clients-tbody').innerHTML = renderAdminClientsRows(window.adminClientsData);
        return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = window.adminClientsData.filter(client => {
        const name = (client.full_name || '').toLowerCase();
        const email = (client.email || '').toLowerCase();
        const phone = (client.whatsapp || '').toLowerCase();
        return name.includes(lowerQuery) || email.includes(lowerQuery) || phone.includes(lowerQuery);
    });
    document.getElementById('admin-clients-tbody').innerHTML = renderAdminClientsRows(filtered);
};


window.adminChangeUserPassword = async function(userId) {
    const newPassword = prompt("Ingresa la nueva contraseña para este usuario:");
    if (!newPassword || newPassword.trim() === "") return;
    
    try {
        const { error } = await supabaseClient.rpc('admin_set_user_password', {
            target_user_id: userId,
            new_password: newPassword
        });
        if (error) throw error;
        alert("Contraseña cambiada con éxito.");
    } catch(e) {
        alert("Error al cambiar contraseña: " + e.message);
    }
};

window.updateUserRole = async function(userId, newRole) {
    if (!confirm(`¿Estás seguro de cambiar el rol a ${newRole.toUpperCase()}? Los administradores tienen control total del panel.`)) return;
    const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) alert("Error al cambiar rol: " + error.message);
    else alert("Rol actualizado. Los cambios aplicarán en su próxima recarga o inicio de sesión.");
};

window.updateUserTier = async function(userId, newTier) {
    const { error } = await supabaseClient.from('profiles').update({ tier: newTier }).eq('id', userId);
    if (error) alert("Error al cambiar rango: " + error.message);
    else alert("Rango actualizado correctamente.");
};

// === ADMIN: CONFIGURACIONES ===
async function loadAdminSettings(container) {
    const pm = globalPaymentInfo || { pago_movil: {}, binance: {} };
    
    container.innerHTML = `
        <div class="dashboard-card" style="max-width: 500px; margin-bottom: 20px;">
            <h3 style="margin-bottom: 20px;">Tasa de Cambio Global</h3>
            <div class="form-group">
                <label class="form-label">Tasa Actual del Dólar (Bs por 1 USDT)</label>
                <input type="number" id="admin-exchange-rate" class="form-input" value="${globalExchangeRate}" step="0.01">
            </div>
            <button class="btn btn-outline" onclick="saveSettings()">Guardar Tasa</button>
        </div>

        <div class="dashboard-card" style="max-width: 500px;">
            <h3 style="margin-bottom: 20px;">Métodos de Pago</h3>
            
            <h4 style="color:var(--gold); margin-bottom: 10px;">Pago Móvil</h4>
            <div class="form-group">
                <label class="form-label">Banco</label>
                <input type="text" id="admin-pm-banco" class="form-input" value="${pm.pago_movil?.banco || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input type="text" id="admin-pm-telefono" class="form-input" value="${pm.pago_movil?.telefono || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Cédula</label>
                <input type="text" id="admin-pm-cedula" class="form-input" value="${pm.pago_movil?.cedula || ''}">
            </div>

            <h4 style="color:var(--gold); margin-top: 20px; margin-bottom: 10px;">Binance</h4>
            <div class="form-group">
                <label class="form-label">Pay ID / Correo</label>
                <input type="text" id="admin-pm-binance" class="form-input" value="${pm.binance?.pay_id || ''}">
            </div>
        </div>
        
        <div class="dashboard-card" style="max-width: 500px; margin-top: 20px;">
            <h3 style="margin-bottom: 20px;">Redes Sociales (Pie de Página)</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 15px;">Deja en blanco los que no uses.</p>
            
            <div class="form-group">
                <label class="form-label">Link de Facebook</label>
                <input type="text" id="admin-soc-fb" class="form-input" value="${globalSocialLinks.facebook || ''}" placeholder="Ej: https://facebook.com/vortexcoins">
            </div>
            <div class="form-group">
                <label class="form-label">Link de Instagram</label>
                <input type="text" id="admin-soc-ig" class="form-input" value="${globalSocialLinks.instagram || ''}" placeholder="Ej: https://instagram.com/vortexcoins">
            </div>
            <div class="form-group">
                <label class="form-label">Link de TikTok</label>
                <input type="text" id="admin-soc-tk" class="form-input" value="${globalSocialLinks.tiktok || ''}" placeholder="Ej: https://tiktok.com/@vortexcoins">
            </div>
            
            <button class="btn btn-outline" style="margin-top: 15px;" onclick="saveSettings()">Guardar Todas las Configuraciones</button>
        </div>
    `;
}

window.saveSettings = async function() {
    const newRate = parseFloat(document.getElementById('admin-exchange-rate').value);
    if (!newRate || newRate <= 0) return alert("Ingresa una tasa válida.");
    
    const newPmInfo = {
        pago_movil: {
            banco: document.getElementById('admin-pm-banco').value,
            telefono: document.getElementById('admin-pm-telefono').value,
            cedula: document.getElementById('admin-pm-cedula').value
        },
        binance: {
            pay_id: document.getElementById('admin-pm-binance').value
        }
    };
    
    const newSocialLinks = {
        facebook: document.getElementById('admin-soc-fb').value.trim(),
        instagram: document.getElementById('admin-soc-ig').value.trim(),
        tiktok: document.getElementById('admin-soc-tk').value.trim()
    };

    if (globalSettingsId) {
        const { error } = await supabaseClient.from('settings').update({ 
            exchange_rate: newRate,
            payment_info: newPmInfo,
            social_facebook: newSocialLinks.facebook,
            social_instagram: newSocialLinks.instagram,
            social_tiktok: newSocialLinks.tiktok
        }).eq('id', globalSettingsId);
        
        if (error) alert("Error: " + error.message);
        else {
            alert("Configuraciones actualizadas exitosamente.");
            globalExchangeRate = newRate;
            globalPaymentInfo = newPmInfo;
            globalSocialLinks = newSocialLinks;
            updateFooterLinks();
        }
    } else {
        alert("No se encontró el registro de configuraciones. Verifica la tabla settings.");
    }
};

// Utilidad global
window.copyText = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("Copiado: " + text);
    });
};

window.copyPaymentInfo = function(field) {
    if (!globalPaymentInfo) return;
    
    if (field === 'banco') copyText(globalPaymentInfo.pago_movil?.banco || '');
    if (field === 'telefono') copyText(globalPaymentInfo.pago_movil?.telefono || '');
    if (field === 'cedula') copyText(globalPaymentInfo.pago_movil?.cedula || '');
    if (field === 'binance') copyText(globalPaymentInfo.binance?.pay_id || '');
    if (field === 'all_pm') {
        const { banco, telefono, cedula } = globalPaymentInfo.pago_movil || {};
        copyText(`${banco || ''} ${telefono || ''} ${cedula || ''}`.trim());
    }
};

// ==========================================
// 10. RESEÑAS
// ==========================================
const reviewOverlay = document.getElementById('review-modal-overlay');

window.openReviewModal = function() {
    if (!currentUser) return alert("Debes iniciar sesión para dejar una reseña.");
    document.getElementById('rev-rating').value = '5';
    document.getElementById('rev-comment').value = '';
    reviewOverlay.classList.add('active');
};

window.closeReviewModal = function() {
    reviewOverlay.classList.remove('active');
};

document.getElementById('review-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const btn = document.getElementById('btn-submit-review');
    btn.disabled = true;
    btn.textContent = "Enviando...";

    const rating = parseInt(document.getElementById('rev-rating').value);
    const comment = document.getElementById('rev-comment').value;

    try {
        const { error } = await supabaseClient.from('reviews').insert([{
            user_id: currentUser.id,
            rating: rating,
            comment: comment,
            author_name: currentProfile.full_name
        }]);

        if (error) throw error;

        alert("¡Gracias por tu opinión!");
        closeReviewModal();
        if (window.location.hash === '#/' || window.location.hash === '') {
            loadHomeReviews(); // Recargar reseñas si está en la home
        }
    } catch (e) {
        alert("Error al enviar la reseña: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Enviar Reseña";
    }
});

// ==========================================
// 12. NOTIFICACIONES EN TIEMPO REAL
// ==========================================
let unreadNotificationsCount = 0;
let notificationsRealtimeSubscription = null;

window.toggleNotifications = function() {
    const panel = document.getElementById('notifications-panel');
    panel.classList.toggle('active');
};

window.loadNotifications = async function() {
    if (!currentUser) return;
    
    document.getElementById('notifications-wrapper').style.display = 'block';

    const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error cargando notificaciones:", error);
        return;
    }

    renderNotifications(data);
};

function renderNotifications(data) {
    const list = document.getElementById('notifications-list');
    const badge = document.getElementById('notification-badge');
    
    if (!data || data.length === 0) {
        list.innerHTML = '<div class="notification-item empty">No tienes notificaciones.</div>';
        badge.style.display = 'none';
        return;
    }

    unreadNotificationsCount = data.filter(n => !n.is_read).length;
    
    if (unreadNotificationsCount > 0) {
        badge.textContent = unreadNotificationsCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }

    list.innerHTML = data.map(n => `
        <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="handleNotificationClick('${n.id}', '${n.link}')">
            ${n.message}
            <span class="notification-time">${new Date(n.created_at).toLocaleString()}</span>
        </div>
    `).join('');
}

window.handleNotificationClick = async function(id, link) {
    await supabaseClient.from('notifications').update({ is_read: true }).eq('id', id);
    document.getElementById('notifications-panel').classList.remove('active');
    loadNotifications();

    if (link && link !== '#') {
        window.location.hash = link;
    }
};

window.markAllAsRead = async function() {
    if (!currentUser || unreadNotificationsCount === 0) return;
    
    await supabaseClient.from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);
        
    loadNotifications();
};

window.setupRealtimeNotifications = function() {
    if (!currentUser) return;

    if (notificationsRealtimeSubscription) {
        supabaseClient.removeChannel(notificationsRealtimeSubscription);
    }

    notificationsRealtimeSubscription = supabaseClient.channel('custom-all-channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications' },
            (payload) => {
                // Si la notificacion es para este usuario, recargamos
                if (payload.new && payload.new.user_id === currentUser.id) {
                    loadNotifications();
                }
            }
        )
        .subscribe();
};

// ==========================================
// 14. ADMIN: PROMOCIONES Y OFERTAS
// ==========================================
async function loadAdminPromotions(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3>Ofertas Especiales (Carrusel)</h3>
            <button class="btn btn-outline" style="border-color: var(--cyan-neon); color: var(--cyan-neon);" onclick="openPromoModal()">+ Nueva Oferta</button>
        </div>
        <div id="promos-list" class="products-grid"><div class="loader">Cargando promociones...</div></div>
    `;

    const { data, error } = await supabaseClient.from('special_offers').select('*').order('created_at', { ascending: false });
    const list = document.getElementById('promos-list');

    if (error) {
        list.innerHTML = `<p>Error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = `<p>No hay ofertas creadas.</p>`;
        return;
    }

    list.innerHTML = data.map(offer => `
        <div class="product-card" style="text-align: center; opacity: ${offer.is_active ? 1 : 0.5}; border-color: ${offer.is_active ? 'var(--gold)' : '#333'}">
            <img src="${offer.image_url}" style="max-width: 100%; height: 100px; object-fit: cover; border-radius: 8px;">
            <h4>${offer.title}</h4>
            <p style="color:var(--cyan-neon); font-weight:bold;">${offer.price_usdt} USDT</p>
            <p style="font-size: 0.8rem; color: #888;">Categoría: ${offer.category || 'General (Inicio)'}</p>
            <div style="margin-top: 10px; display: flex; gap: 5px; justify-content: center;">
                <button onclick="togglePromoStatus('${offer.id}', ${!offer.is_active})" class="btn btn-outline" style="padding: 5px; font-size: 0.8rem;">${offer.is_active ? 'Desactivar' : 'Activar'}</button>
                <button onclick="deletePromo('${offer.id}')" class="btn btn-outline" style="padding: 5px; font-size: 0.8rem; color: #ef4444; border-color: #ef4444;">Eliminar</button>
            </div>
            <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 5px;">Subir Imagen:</label>
                <input type="file" accept=".png, .jpg, .jpeg, .webp" onchange="uploadPromoImage(event, '${offer.id}')" style="font-size: 11px; width: 100%;">
                <small id="promo-img-status-${offer.id}" style="color:var(--text-muted); display:block; margin-top:5px;"></small>
            </div>
        </div>
    `).join('');
}

window.openPromoModal = function() {
    document.getElementById('promo-modal-overlay').classList.add('active');
    document.getElementById('promo-form').reset();
    document.getElementById('btn-submit-promo').textContent = 'Crear Oferta';
    document.getElementById('btn-submit-promo').disabled = false;
};

window.closePromoModal = function() {
    document.getElementById('promo-modal-overlay').classList.remove('active');
};

document.getElementById('promo-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-promo');
    btn.disabled = true;
    btn.textContent = 'Subiendo imagen y creando...';

    const title = document.getElementById('promo-title').value;
    const price = document.getElementById('promo-price').value;
    const category = document.getElementById('promo-category').value.trim();
    const file = document.getElementById('promo-image').files[0];

    try {
        let imageUrl = '';
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `promo-new-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabaseClient.storage.from('site_images').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data } = supabaseClient.storage.from('site_images').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }

        const reqFields = [];
        if (document.getElementById('req-correo')?.checked) reqFields.push({ name: 'Correo', label: 'Correo Electrónico', type: 'email', placeholder: 'Ej: cuenta@correo.com' });
        if (document.getElementById('req-pass')?.checked) reqFields.push({ name: 'Contraseña', label: 'Contraseña', type: 'text', placeholder: 'Contraseña de la cuenta' });
        if (document.getElementById('req-id')?.checked) reqFields.push({ name: 'ID de Jugador', label: 'ID de Jugador / UID', type: 'text', placeholder: 'Ej: 123456789' });
        if (document.getElementById('req-perfil')?.checked) reqFields.push({ name: 'Nombre de Perfil', label: 'Nombre de Perfil (Opcional)', type: 'text', placeholder: 'Ej: Mi Perfil' });
        if (document.getElementById('req-link-perfil')?.checked) reqFields.push({ name: 'Link del Perfil', label: 'Link del Perfil', type: 'url', placeholder: 'Ej: https://steamcommunity.com/id/usuario' });
        if (document.getElementById('req-pin')?.checked) reqFields.push({ name: 'PIN', label: 'PIN (Opcional)', type: 'text', placeholder: 'Ej: 1234' });

        const note = document.getElementById('promo-note')?.value.trim();

        const { error } = await supabaseClient.from('special_offers').insert([{
            title, 
            price_usdt: parseFloat(price), 
            category: category || null, 
            image_url: imageUrl, 
            is_active: true,
            required_fields: reqFields,
            note: note || null
        }]);
        
        if (error) throw error;

        alert("Oferta creada con éxito.");
        closePromoModal();
        switchAdminTab('promotions');
    } catch (err) {
        alert("Error: " + err.message);
        btn.disabled = false;
        btn.textContent = 'Crear Oferta';
    }
});

window.uploadPromoImage = async function(event, id) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById(`promo-img-status-${id}`);
    statusEl.textContent = "Subiendo...";

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `promo-${id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabaseClient.storage.from('site_images').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseClient.storage.from('site_images').getPublicUrl(fileName);

        const { error: updateError } = await supabaseClient.from('special_offers').update({ image_url: publicUrl }).eq('id', id);
        if (updateError) throw updateError;

        statusEl.textContent = "¡Subida exitosa!";
        statusEl.style.color = "#10b981";
        setTimeout(() => switchAdminTab('promotions'), 1000);
    } catch (e) {
        statusEl.textContent = "Error: " + e.message;
        statusEl.style.color = "#ef4444";
    }
};

window.togglePromoStatus = async function(id, is_active) {
    await supabaseClient.from('special_offers').update({ is_active }).eq('id', id);
    switchAdminTab('promotions');
};

window.deletePromo = async function(id) {
    if(!confirm("¿Eliminar esta oferta?")) return;
    await supabaseClient.from('special_offers').delete().eq('id', id);
    switchAdminTab('promotions');
};

// ==========================================
// 15. ADMIN: INVENTARIO (AUTO-ENTREGA)
// ==========================================
async function loadAdminInventory(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3>Inventario (Auto-Entrega)</h3>
            <button class="btn btn-outline" style="border-color: var(--cyan-neon); color: var(--cyan-neon);" onclick="openInventoryModal()">+ Añadir Stock</button>
        </div>
        <div class="dashboard-card table-wrapper">
            <table class="data-table">
                <thead><tr><th>Producto</th><th>Datos de Cuenta</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody id="inventory-tbody"><tr><td colspan="4">Cargando...</td></tr></tbody>
            </table>
        </div>
    `;

    const { data, error } = await supabaseClient.from('product_inventory')
        .select('*, products(name)')
        .order('created_at', { ascending: false });

    if (error) return;

    if (data.length === 0) {
        document.getElementById('inventory-tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay inventario registrado.</td></tr>';
        return;
    }

    document.getElementById('inventory-tbody').innerHTML = data.map(inv => `
        <tr>
            <td>${inv.products?.name}</td>
            <td>
                <div style="font-size:12px; font-family:monospace; color:var(--cyan-neon);">
                    ${Object.entries(inv.account_data || {}).map(([k,v]) => `${k}: ${v}`).join('<br>')}
                </div>
            </td>
            <td><span class="badge badge-${inv.status === 'available' ? 'completed' : 'processing'}">${inv.status === 'available' ? 'Disponible' : 'Vendido'}</span></td>
            <td>
                ${inv.status === 'available' ? `<button class="btn btn-outline" onclick="deleteInventory('${inv.id}')" style="color:#ef4444; border-color:#ef4444; padding:5px; font-size:0.8rem;">Eliminar</button>` : `<small style="color:var(--text-muted)">Orden: ${inv.order_id}</small>`}
            </td>
        </tr>
    `).join('');
}

window.openInventoryModal = async function() {
    // Buscar todos los productos
    const { data: prods } = await supabaseClient.from('products').select('id, name').order('name');
    
    // Crear el HTML del Modal Dinámico
    const modalHtml = `
        <div class="modal-overlay active" id="inventory-modal-overlay">
            <div class="checkout-modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 style="font-family: var(--font-heading); color: var(--cyan-neon);">Añadir Inventario (Cuentas)</h3>
                    <button class="modal-close" onclick="document.getElementById('inventory-modal-overlay').remove()">&times;</button>
                </div>
                <form id="inventory-form" style="margin-top: 15px;">
                    <div class="form-group">
                        <label class="form-label">Producto Asignado</label>
                        <select id="inv-prod" class="form-input" style="background: var(--bg-dark); color: white;" required>
                            <option value="">Selecciona un producto...</option>
                            ${prods.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Correo de la Cuenta</label>
                        <input type="text" id="inv-email" class="form-input" required placeholder="Ej: cuenta@correo.com">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contraseña</label>
                        <input type="text" id="inv-pass" class="form-input" required placeholder="Contraseña de la cuenta">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nombre de Perfil (Opcional, ej: Netflix)</label>
                        <input type="text" id="inv-prof" class="form-input" placeholder="Ej: Perfil 1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">PIN del Perfil (Opcional)</label>
                        <input type="text" id="inv-pin" class="form-input" placeholder="Ej: 1234">
                    </div>
                    <button type="submit" class="btn btn-outline" style="width: 100%; border-color: var(--cyan-neon); color: var(--cyan-neon);">Guardar Inventario</button>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('inventory-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const prodId = document.getElementById('inv-prod').value;
        
        let accountData = {
            "Correo": document.getElementById('inv-email').value.trim(),
            "Contraseña": document.getElementById('inv-pass').value.trim()
        };

        const profName = document.getElementById('inv-prof').value.trim();
        const profPin = document.getElementById('inv-pin').value.trim();
        
        if (profName) accountData["Nombre de Perfil"] = profName;
        if (profPin) accountData["PIN"] = profPin;

        try {
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = "Guardando...";

            const { error } = await supabaseClient.from('product_inventory').insert([{
                product_id: prodId,
                account_data: accountData,
                status: 'available'
            }]);

            if (error) throw error;
            alert("Stock añadido exitosamente.");
            document.getElementById('inventory-modal-overlay').remove();
            switchAdminTab('inventory');
        } catch(err) {
            alert("Error al guardar: " + err.message);
        }
    });
};

window.deleteInventory = async function(id) {
    if(!confirm("¿Eliminar este stock?")) return;
    await supabaseClient.from('product_inventory').delete().eq('id', id);
    switchAdminTab('inventory');
};

// ==========================================
// 16. ADMIN: ALERTAS GLOBALES
// ==========================================
async function loadAdminAlerts(container) {
    container.innerHTML = `
        <div class="dashboard-card" style="max-width: 600px; margin: 0 auto;">
            <h3 style="color: var(--cyan-neon); font-family: var(--font-heading); margin-bottom: 20px;">📢 Enviar Alerta Global</h3>
            <p style="color: var(--text-muted); margin-bottom: 20px;">Envía una notificación a todos los usuarios registrados. Si tienen las notificaciones activadas, les llegará un Push.</p>
            <form onsubmit="sendGlobalAlert(event)">
                <div class="form-group">
                    <label class="form-label">Mensaje de la Alerta (Max 250 caract.)</label>
                    <textarea id="alert-msg" class="form-input" rows="3" required style="resize:vertical;" placeholder="Ej: ¡Llegó nuevo stock de diamantes!"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Link (Opcional, a dónde los llevará al hacer clic)</label>
                    <input type="text" id="alert-link" class="form-input" placeholder="Ej: /free-fire">
                </div>
                <button type="submit" class="btn" style="width: 100%; background: var(--cyan-neon); color: var(--bg-dark);" id="btn-send-alert">🚀 Enviar Alerta a Todos</button>
            </form>
        </div>
    `;
}

window.sendGlobalAlert = async function(e) {
    e.preventDefault();
    if(!confirm("¿Estás seguro de enviar esta alerta a TODOS los usuarios?")) return;

    const btn = document.getElementById('btn-send-alert');
    btn.disabled = true;
    btn.textContent = "Enviando...";

    const msg = document.getElementById('alert-msg').value.trim();
    const link = document.getElementById('alert-link').value.trim() || '#';

    try {
        const { error } = await supabaseClient.rpc('send_global_alert', {
            p_message: msg,
            p_link: link
        });

        if (error) throw error;

        alert("¡Alerta enviada exitosamente a todos los usuarios!");
        document.getElementById('alert-msg').value = '';
        document.getElementById('alert-link').value = '';
    } catch(err) {
        alert("Error al enviar: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "🚀 Enviar Alerta a Todos";
    }
};

// ==========================================
// 17. ACTUALIZACIÓN DEL FOOTER Y TÉRMINOS
// ==========================================
window.updateFooterLinks = function() {
    const fb = document.getElementById('footer-fb');
    const ig = document.getElementById('footer-ig');
    const tk = document.getElementById('footer-tk');
    
    if (fb) {
        fb.href = globalSocialLinks.facebook || '#';
        fb.style.display = globalSocialLinks.facebook ? 'inline-flex' : 'none';
    }
    if (ig) {
        ig.href = globalSocialLinks.instagram || '#';
        ig.style.display = globalSocialLinks.instagram ? 'inline-flex' : 'none';
    }
    if (tk) {
        tk.href = globalSocialLinks.tiktok || '#';
        tk.style.display = globalSocialLinks.tiktok ? 'inline-flex' : 'none';
    }
};

window.renderTerms = function() {
    document.title = "Términos y Condiciones | Vortex Coins";
    appContainer.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); text-align: left;">
            <h1 style="color: var(--cyan-neon); font-family: var(--font-heading); margin-bottom: 20px; text-align: center;">Políticas de Privacidad y Términos de Servicio</h1>
            
            <h3 style="color: var(--gold); margin-top: 20px;">1. MARCO JURÍDICO RECTOR (BASE LEGAL VENEZOLANA)</h3>
            <p>Este documento y el tratamiento que le damos a tus datos personales se fundamentan firmemente en el ordenamiento jurídico venezolano vigente:</p>
            <ul>
                <li><strong>Constitución de la República Bolivariana de Venezuela (CRBV):</strong>
                    <ul>
                        <li><strong>Artículo 60:</strong> Garantiza el derecho a la protección de la honra, la reputación, la vida privada, la intimidad y la propia imagen.</li>
                        <li><strong>Artículo 48:</strong> Establece el secreto e inviolabilidad de las comunicaciones privadas en todas sus formas. La información tecnológica recopilada por esta vía cuenta con este amparo constitucional.</li>
                        <li><strong>Artículo 28 (Acceso a la Información y Hábeas Data):</strong> Reconoce el derecho de toda persona a conocer los datos que de sí misma consten en registros oficiales o privados, así como la finalidad para la cual se utilizan, y a exigir su rectificación o destrucción si fuesen erróneos o afectasen sus derechos.</li>
                    </ul>
                </li>
                <li><strong>Ley Especial Contra los Delitos Informáticos:</strong>
                    <ul>
                        <li><strong>Artículo 20 (Violación de la Privacidad de la Información):</strong> Sanciona penalmente a quien acceda, modifique o divulgue información confidencial sin autorización. Nos obliga como administradores a mantener tus datos bajo estricto resguardo digital.</li>
                        <li><strong>Artículo 22 (Revelación Indebida de Datos o Información):</strong> Castiga la revelación de datos personales que estén resguardados en un sistema informático.</li>
                    </ul>
                </li>
                <li><strong>Ley de Mensajes de Datos y Firmas Electrónicas (Artículo 4):</strong> Otorga validez legal al consentimiento explícito otorgado por el usuario mediante medios electrónicos para el tratamiento de su información.</li>
            </ul>

            <h3 style="color: var(--gold); margin-top: 20px;">2. INFORMACIÓN RECOPILADA</h3>
            <p>Para la correcta ejecución del servicio automatizado de recargas, La Plataforma solicita y procesa únicamente los datos estrictamente necesarios, clasificados en:</p>
            <ul>
                <li><strong>2.1. Datos de Identificación en el Juego:</strong> Identificador único de jugador (ID / UID). Alias, apodo o Nickname dentro del videojuego (utilizado exclusivamente por el sistema para validar de manera tecnológica que el ID ingresado coincida con el usuario real antes de enviar los créditos).</li>
                <li><strong>2.2. Datos de Verificación Financiera:</strong> Captura de pantalla (imagen) del comprobante de transferencia bancaria o Pago Móvil. Número de referencia o confirmación de la transacción emitido por la entidad bancaria. Nombre del titular de la cuenta emisora del pago (cuando apliquen protocolos de auditoría interna).</li>
                <li><strong>2.3. Datos de Comunicación Opcionales:</strong> Número de teléfono (WhatsApp) o correo electrónico, utilizados únicamente para el envío de alertas automáticas sobre el estado de la recarga (Ej: "Pago aprobado", "Recarga exitosa") o para brindar soporte técnico en caso de fallas.</li>
            </ul>

            <h3 style="color: var(--gold); margin-top: 20px;">3. FINALIDAD DEL TRATIMIENTO DE LOS DATOS</h3>
            <p>La Plataforma recopila y procesa su información para los siguientes fines específicos:</p>
            <ul>
                <li><strong>Ejecución del Servicio:</strong> Procesar y validar de manera automatizada las órdenes de recargas de diamantes o créditos en los videojuegos seleccionados.</li>
                <li><strong>Conciliación Bancaria:</strong> Verificar con las entidades financieras que los fondos reportados hayan ingresado efectivamente a nuestras cuentas.</li>
                <li><strong>Prevención de Fraude:</strong> Auditar los comprobantes digitales para evitar el forjamiento de documentos, duplicidad de referencias o estafas de triangulación.</li>
                <li><strong>Soporte Técnico:</strong> Atender y resolver de manera eficiente cualquier reclamo o incidencia reportada por El Cliente.</li>
            </ul>

            <h3 style="color: var(--gold); margin-top: 20px;">4. CONFIDENCIALIDAD Y NO DIVULGACIÓN A TERCEROS</h3>
            <p>En estricto apego al secreto de las comunicaciones (Art. 48 CRBV):</p>
            <ul>
                <li><strong>Prohibición de Comercialización:</strong> La Plataforma no vende, no alquila, no intercambia ni cede bajo ningún concepto los datos personales, financieros o de contacto de sus usuarios a terceras empresas o agencias publicitarias.</li>
                <li><strong>Excepción de Ley:</strong> Los datos almacenados únicamente podrán ser revelados a las autoridades judiciales de la República Bolivariana de Venezuela (como el Ministerio Público o el CICPC) en caso de que exista una orden judicial expresa o en el marco de una investigación penal formal por fraude electrónico o legitimación de capitales.</li>
            </ul>

            <h3 style="color: var(--gold); margin-top: 20px;">5. SEGURIDAD DE LA INFORMACIÓN Y ALMACENAMIENTO</h3>
            <p>Implementamos medidas técnicas, administrativas y lógicas para proteger sus datos contra accesos no autorizados, modificaciones o destrucción:</p>
            <ul>
                <li><strong>Cifrado de Datos:</strong> Las imágenes de los comprobantes de pago y los registros de transacciones se almacenan en bases de datos con protocolos de cifrado y acceso restringido.</li>
                <li><strong>Políticas de Retención Limitada:</strong> Los archivos visuales (comprobantes de pago) se retienen en nuestros servidores únicamente durante el tiempo necesario para cumplir con los procesos de auditoría contable interna y control de fraudes. Cumplido este lapso (máximo 60 días), los archivos son eliminados de forma definitiva y segura de nuestros sistemas informáticos.</li>
            </ul>

            <h3 style="color: var(--gold); margin-top: 20px;">6. EJERCICIO DE LOS DERECHOS DE ACCESO, RECTIFICACIÓN Y SUPRESIÓN (HÁBEAS DATA)</h3>
            <p>De acuerdo con el Artículo 28 de la CRBV, El Cliente tiene derecho a ejercer sus facultades de control sobre sus datos personales. Para ello, puede contactar a nuestro equipo de atención al cliente para: Conocer, Rectificar o Suprimir sus datos.</p>

            <h3 style="color: var(--gold); margin-top: 20px;">7. ACEPTACIÓN DE ESTA POLÍTICA</h3>
            <p>Al marcar la casilla de aceptación en nuestra interfaz, utilizar nuestro sistema o proceder a adjuntar un comprobante de pago, usted otorga su consentimiento expreso, libre, informado e inequívoco para que La Plataforma recolecte y trate sus datos bajo los términos descritos en este documento.</p>
            
            <div style="margin-top: 40px; text-align: center;">
                <button class="btn" onclick="window.history.back()">Volver</button>
            </div>
        </div>
    `;
};
