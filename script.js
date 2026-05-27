// Configuration
const SUPABASE_URL = 'https://qcwrccquctttqniketby.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd3JjY3F1Y3R0dHFuaWtldGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjgzOTIsImV4cCI6MjA5MzAwNDM5Mn0.R_tLtoaPRczxD1LVvArq2HFHzer1jWeOpJK_o9hPDr0';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global Toast System
window.showToast = function(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span style="white-space: pre-line;">${message}</span>
        <button style="background:none; border:none; color:#fff; cursor:pointer; font-weight:bold; font-size:1.1rem; padding:0; line-height: 1;" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => toast.remove(), 500);
    }, 6000);
}

const EXTRAS = {
    pan_obrador: { name: 'Pan Obrador', price: 0.30 }
};

const PHOTO_EXTRAS = {
    salsas: [
        { id: 's1', name: 'Mayonesa', price: 0.60 },
        { id: 's2', name: 'Kétchup', price: 0.60 },
        { id: 's3', name: 'Alioli', price: 0.60 },
        { id: 's4', name: 'Barbacoa', price: 0.60 },
        { id: 's5', name: 'Yogurt', price: 0.60 },
        { id: 's6', name: 'Cheddar', price: 0.60 },
        { id: 's7', name: 'Mojo picón', price: 0.60 },
        { id: 's8', name: 'Gaucha', price: 0.60 },
        { id: 's9', name: 'Roquefort', price: 0.60 },
        { id: 's10', name: 'Whisky', price: 0.60 },
        { id: 's11', name: 'Vasito extra', price: 1.00 }
    ],
    extras: [
        { id: 'e1', name: 'Queso lonchas', price: 0.70 },
        { id: 'e2', name: 'Queso cheddar', price: 0.70 },
        { id: 'e3', name: 'Papas paja', price: 0.70 },
        { id: 'e4', name: 'Tomate rodajas', price: 1.20 },
        { id: 'e5', name: 'Bacón', price: 1.20 },
        { id: 'e6', name: 'Jamón', price: 1.50 },
        { id: 'e7', name: 'Q. rulo de cabra', price: 1.50 },
        { id: 'e8', name: 'Queso curado', price: 1.50 },
        { id: 'e9', name: 'T. francesa', price: 1.50 },
        { id: 'e10', name: 'T. de papas', price: 1.50 }
    ]
};

// Configuracion Global
let configuracionTienda = null;

// State
let menuItems = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentFilter = 'all';
let currentPage = 1;
let currentUser = null;
const ITEMS_PER_PAGE = 12;

// Normalización inmediata de datos antiguos
cart = cart.map(item => ({
    ...item,
    selectedExtras: item.selectedExtras || [],
    basePrice: item.basePrice || item.price || 0,
    price: item.price || 0,
    pan_obrador: item.pan_obrador || false
}));

// DOM Elements
const menuGrid = document.getElementById('menu-grid');
const categoryFilters = document.getElementById('category-filters');
const cartToggle = document.getElementById('cart-toggle');
const cartModal = document.getElementById('cart-modal');
const closeModal = document.getElementById('close-modal');
const cartItemsList = document.getElementById('cart-items-list');
const cartTotalLabel = document.getElementById('cart-total');
const cartCountLabel = document.getElementById('cart-count');
const checkoutBtn = document.getElementById('checkout-btn');

// Initialization
async function init() {
    await loadConfiguracion();
    if (document.getElementById('promotions-section')) {
        await loadPromotions();
    }
    if (menuGrid) {
        await loadMenu();
        renderMenu();
        setupFilters();
    }
    setupAuth();
    updateCartUI();
    setupCookies();
    setupTracking();
    checkActiveOrders();
    setInterval(checkActiveOrders, 20000);
}

// Carousel state
let slideIndex = 0;
let autoPlayInterval = null;

async function loadPromotions() {
    const promoSection = document.getElementById('promotions-section');
    const promoSlider = document.getElementById('promo-slider');
    const promoDotsContainer = document.getElementById('promo-dots');
    
    if (!promoSection || !promoSlider) return;

    try {
        const { data: promotions, error } = await supabaseClient
            .from('promocion')
            .select('*')
            .eq('disponible', true)
            .order('orden', { ascending: true });

        if (error) throw error;

        if (!promotions || promotions.length === 0) {
            promoSection.style.display = 'none';
            return;
        }

        // Render slides
        promoSlider.innerHTML = promotions.map(p => `
            <div class="promo-slide">
                <img src="${p.image_url}" alt="${p.titulo}">
                <div class="promo-overlay">
                    <h2>${p.titulo}</h2>
                    ${p.descripcion ? `<p>${p.descripcion}</p>` : ''}
                </div>
            </div>
        `).join('');

        // Render dots
        if (promoDotsContainer) {
            promoDotsContainer.innerHTML = promotions.map((_, index) => `
                <span class="dot ${index === 0 ? 'active' : ''}" onclick="currentSlide(${index})"></span>
            `).join('');
        }

        // Show section
        promoSection.style.display = 'block';

        // Initialize Carousel
        initCarousel(promotions.length);

    } catch (e) {
        console.error("Error al cargar las promociones:", e);
        promoSection.style.display = 'none';
    }
}

function initCarousel(slidesCount) {
    const slider = document.getElementById('promo-slider');
    const prevBtn = document.getElementById('promo-prev-btn');
    const nextBtn = document.getElementById('promo-next-btn');

    if (!slider) return;

    function showSlide(index) {
        if (index >= slidesCount) {
            slideIndex = 0;
        } else if (index < 0) {
            slideIndex = slidesCount - 1;
        } else {
            slideIndex = index;
        }

        // Slide transform
        slider.style.transform = `translateX(-${slideIndex * 100}%)`;

        // Update dots
        const dots = document.querySelectorAll('#promo-dots .dot');
        dots.forEach((dot, idx) => {
            if (idx === slideIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    window.currentSlide = function(index) {
        showSlide(index);
        resetAutoPlay();
    };

    if (prevBtn) {
        prevBtn.onclick = () => {
            showSlide(slideIndex - 1);
            resetAutoPlay();
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            showSlide(slideIndex + 1);
            resetAutoPlay();
        };
    }

    // Auto Play
    function startAutoPlay() {
        if (slidesCount > 1) {
            autoPlayInterval = setInterval(() => {
                showSlide(slideIndex + 1);
            }, 5000);
        }
    }

    function resetAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            startAutoPlay();
        }
    }

    startAutoPlay();
}


async function loadConfiguracion() {
    try {
        const { data, error } = await supabaseClient.from('configuracion').select('horarios').eq('id', 1).single();
        if (!error && data) {
            configuracionTienda = data.horarios;
        }
    } catch (e) {
        console.error("No se pudo cargar la configuración:", e);
    }
}

function isShopOpen() {
    if (!configuracionTienda) return true; // Abierto por defecto si falla la carga
    
    const now = new Date();
    const day = now.getDay(); // 0: Dom, 1: Lun ... 6: Sab
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour + currentMinute / 60.0;
    
    const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':');
        return parseInt(h) + parseInt(m) / 60.0;
    };
    
    const h = configuracionTienda;
    
    if (day >= 1 && day <= 5) { // Lunes a Viernes
        const mStart = parseTime(h.lv_manana_start);
        const mEnd = parseTime(h.lv_manana_end);
        const tStart = parseTime(h.lv_tarde_start);
        const tEnd = parseTime(h.lv_tarde_end);
        
        const isManana = (mStart !== null && mEnd !== null) && (currentTime >= mStart && currentTime <= mEnd);
        const isTarde = (tStart !== null && tEnd !== null) && (currentTime >= tStart && currentTime <= tEnd);
        
        return isManana || isTarde;
    } else if (day === 6) { // Sabado
        const mStart = parseTime(h.sabado_start);
        const mEnd = parseTime(h.sabado_end);
        
        return (mStart !== null && mEnd !== null) && (currentTime >= mStart && currentTime <= mEnd);
    } else {
        return false; // Domingo o sin configurar
    }
}

function setupCookies() {
    const cookieBanner = document.getElementById('cookie-banner');
    const acceptCookiesBtn = document.getElementById('accept-cookies');
    
    if (cookieBanner && acceptCookiesBtn) {
        if (!localStorage.getItem('cookies_accepted')) {
            cookieBanner.style.display = 'flex';
        }
        
        acceptCookiesBtn.addEventListener('click', () => {
            localStorage.setItem('cookies_accepted', 'true');
            cookieBanner.style.display = 'none';
        });
    }
}

// Setup Tracking Modal
function setupTracking() {
    const trackingModal = document.getElementById('tracking-modal');
    const openTrackingBtn = document.getElementById('open-tracking-modal');
    const closeTrackingBtn = document.getElementById('close-tracking-modal');
    const btnTrackSubmit = document.getElementById('btn-track-submit');
    const trackCodeInput = document.getElementById('track-code');
    const trackResult = document.getElementById('track-result');
    const trackStatusText = document.getElementById('track-status-text');
    const trackPickupInfo = document.getElementById('track-pickup-info');
    const trackProgress = document.getElementById('track-progress');
    
    const steps = {
        pendiente: document.getElementById('step-pendiente'),
        preparando: document.getElementById('step-preparando'),
        listo: document.getElementById('step-listo'),
        entregado: document.getElementById('step-entregado')
    };

    if (!trackingModal) return;

    if (openTrackingBtn) {
        openTrackingBtn.onclick = (e) => {
            e.preventDefault();
            trackingModal.style.display = 'flex';
            if (trackCodeInput) {
                trackCodeInput.value = '';
                trackCodeInput.focus();
            }
            if (trackResult) trackResult.style.display = 'none';
        };
    }

    if (closeTrackingBtn) {
        closeTrackingBtn.onclick = () => trackingModal.style.display = 'none';
    }

    window.addEventListener('click', (e) => {
        if (e.target === trackingModal) trackingModal.style.display = 'none';
    });

    if (btnTrackSubmit) {
        btnTrackSubmit.onclick = async () => {
            const code = trackCodeInput.value.trim().toUpperCase();
            if (!code || code.length !== 4) {
                showToast('Por favor, introduce un código de 4 caracteres válido.', 'error');
                return;
            }

            btnTrackSubmit.disabled = true;
            btnTrackSubmit.innerText = 'Buscando...';

            try {
                // Consultamos a través de la función RPC segura
                const { data, error } = await supabaseClient.rpc('get_pedido_status', { p_codigo: code });

                if (error) throw error;

                if (!data || data.length === 0) {
                    showToast('Pedido no encontrado. Verifica el código de 4 dígitos.', 'error');
                    trackResult.style.display = 'none';
                    return;
                }

                const pedido = data[0];
                trackResult.style.display = 'block';
                
                // Actualizar textos
                let statusMsg = '';
                let pickupMsg = '';
                let progressWidth = '0%';
                
                // Limpiar clases
                Object.values(steps).forEach(step => {
                    step.classList.remove('active', 'completed');
                });

                if (pedido.estado === 'pendiente') {
                    statusMsg = 'En Cola 🕒';
                    pickupMsg = `Tu pedido está en cocina. Hora de recogida estimada: ${pedido.hora_recogida.substring(0, 5)}`;
                    progressWidth = '0%';
                    steps.pendiente.classList.add('active');
                } else if (pedido.estado === 'preparando') {
                    statusMsg = 'Preparándose 🔥';
                    pickupMsg = `Estamos cocinando tus bocadillos. Estará listo muy pronto.`;
                    progressWidth = '33%';
                    steps.pendiente.classList.add('completed');
                    steps.preparando.classList.add('active');
                } else if (pedido.estado === 'listo') {
                    statusMsg = '¡Listo para recoger! 🎉';
                    pickupMsg = `¡Tu pedido está listo! Pásate por caja a recogerlo. Total a pagar: ${Number(pedido.total).toFixed(2)}€`;
                    progressWidth = '66%';
                    steps.pendiente.classList.add('completed');
                    steps.preparando.classList.add('completed');
                    steps.listo.classList.add('active');
                } else if (pedido.estado === 'entregado') {
                    statusMsg = 'Entregado ✔️';
                    pickupMsg = `¡Pedido entregado! ¡Que aproveche!`;
                    progressWidth = '100%';
                    steps.pendiente.classList.add('completed');
                    steps.preparando.classList.add('completed');
                    steps.listo.classList.add('completed');
                    steps.entregado.classList.add('active');
                } else if (pedido.estado === 'cancelado') {
                    statusMsg = 'Cancelado ❌';
                    pickupMsg = `Este pedido ha sido cancelado. Ponte en contacto con nosotros si es un error.`;
                    progressWidth = '0%';
                }

                trackStatusText.innerText = statusMsg;
                trackPickupInfo.innerText = pickupMsg;
                trackProgress.style.width = progressWidth;

            } catch (err) {
                console.error('Error buscando estado de pedido:', err);
                showToast('Error al consultar el pedido.', 'error');
            } finally {
                btnTrackSubmit.disabled = false;
                btnTrackSubmit.innerText = 'Consultar';
            }
        };
    }
}

// Check Active Orders stored in LocalStorage and sync their status from DB
async function checkActiveOrders() {
    const container = document.getElementById('active-orders-container');
    const list = document.getElementById('active-orders-list');
    if (!container || !list) return;

    let activeCodes = JSON.parse(localStorage.getItem('active_orders') || '[]');
    if (activeCodes.length === 0) {
        container.style.display = 'none';
        return;
    }

    let html = '';
    let updatedCodes = [...activeCodes];

    for (const code of activeCodes) {
        try {
            const { data, error } = await supabaseClient.rpc('get_pedido_status', { p_codigo: code });
            if (error) throw error;

            if (data && data.length > 0) {
                const pedido = data[0];
                
                // Si el pedido está entregado o cancelado, deja de ser activo
                if (pedido.estado === 'entregado' || pedido.estado === 'cancelado') {
                    updatedCodes = updatedCodes.filter(c => c !== code);
                    continue;
                }

                let statusLabel = 'En Cola 🕒';
                let statusColor = '#ffb703';
                if (pedido.estado === 'preparando') {
                    statusLabel = 'Preparando 🔥';
                    statusColor = '#ffb703';
                } else if (pedido.estado === 'listo') {
                    statusLabel = '¡Listo! 🎉';
                    statusColor = '#2a9d8f';
                }

                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px; margin-bottom: 8px; border-left: 3px solid ${statusColor};">
                        <div>
                            <span style="font-weight: 900; color: #fff; letter-spacing: 1px; font-size: 0.95rem;">CÓDIGO: <strong style="color: var(--secondary);">${code}</strong></span><br>
                            <span style="font-size: 0.75rem; color: #aaa;">Hora: ${pedido.hora_recogida.substring(0, 5)}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="background: ${statusColor}; color: ${pedido.estado === 'listo' ? '#fff' : '#000'}; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 900; text-transform: uppercase;">${statusLabel}</span>
                        </div>
                    </div>
                `;
            } else {
                // Si por alguna razón no se encuentra, lo removemos
                updatedCodes = updatedCodes.filter(c => c !== code);
            }
        } catch (err) {
            console.error('Error actualizando pedido activo:', err);
        }
    }

    // Actualizar LocalStorage con los códigos que siguen activos
    localStorage.setItem('active_orders', JSON.stringify(updatedCodes));

    if (html) {
        list.innerHTML = html;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// Data Fetching
async function loadMenu() {
    try {
        const { data: bocadillos, error: bError } = await supabaseClient
            .from('bocadillo')
            .select('*')
            .order('numero_menu', { ascending: true });

        const { data: productos, error: pError } = await supabaseClient
            .from('producto')
            .select('*');

        if (bError || pError) throw bError || pError;

        // Map items to a common format
        const bFormatted = bocadillos.map((b, index) => {
            const item = {
                id: b.id_bocadillo,
                type: 'bocadillo',
                name: b.nombre,
                number: b.numero_menu,
                ingredients: b.num_ingredientes,
                price_caliente: Number(b.precio_caliente.toString().replace(',', '.')), // Corregir formato de precio
                price_frio: b.precio_frio ? Number(b.precio_frio.toString().replace(',', '.')) : null,
                category: getBocadilloCategory(b.num_ingredientes),
                image: b.image_url,
                disponible: b.disponible
            };
            
            return item;
        });

        const pFormatted = productos.map(p => ({
            id: p.id_producto,
            type: 'producto',
            name: p.nombre,
            price_caliente: Number(p.precio),
            price_frio: null,
            category: p.id_categoria === 1 ? 'bebidas' : (p.id_categoria === 2 ? 'extras' : 'salsas'), // Mapeo básico de categorías
            image: p.image_url,
            disponible: p.disponible
        }));

        menuItems = [...bFormatted, ...pFormatted];
    } catch (error) {
        console.error('Error loading menu:', error);
        menuGrid.innerHTML = `<p>Error al cargar el menú. Por favor, intenta de nuevo más tarde.</p>`;
    }
}

function getBocadilloCategory(num) {
    if (num === 1) return '1';
    if (num === 2) return '2';
    if (num === 3) return '3';
    return '4+';
}

// Rendering
function renderMenu() {
    if (!menuGrid) return;
    
    const filtered = currentFilter === 'all' 
        ? menuItems 
        : menuItems.filter(item => item.category === currentFilter);

    // Pagination Logic
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedItems = filtered.slice(start, end);

    menuGrid.innerHTML = paginatedItems.map(item => {
        let priceHTML = '';
        if (item.disponible === false) {
            priceHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="price-tag" style="opacity: 0.5;">${item.price_frio ? `${item.price_frio.toFixed(2)}€ / ` : ''}${item.price_caliente.toFixed(2)}€</div>
                    <span style="background: #ff4444; color: #fff; padding: 6px 12px; border-radius: 4px; font-weight: 800; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 0 10px rgba(255, 68, 68, 0.4);">Agotado</span>
                </div>
            `;
        } else if (item.price_frio) {
            priceHTML = `
                <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 255, 255, 0.1); padding: 8px 12px; border-radius: 4px; border: 1px solid var(--secondary);">
                        <span style="color: var(--secondary); font-weight: 800;">❄️ ${item.price_frio.toFixed(2)}€</span>
                        <button class="order-btn" style="margin: 0; width: auto; padding: 5px 15px; border-color: var(--secondary);" onclick="addToCart(event, '${item.type}', ${item.id}, 'frio')">Añadir</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 0, 255, 0.1); padding: 8px 12px; border-radius: 4px; border: 1px solid var(--primary);">
                        <span style="color: var(--primary); font-weight: 800;">♨️ ${item.price_caliente.toFixed(2)}€</span>
                        <button class="order-btn" style="margin: 0; width: auto; padding: 5px 15px; border-color: var(--primary); color: var(--primary);" onclick="addToCart(event, '${item.type}', ${item.id}, 'caliente')">Añadir</button>
                    </div>
                </div>
            `;
        } else {
            priceHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="price-tag">${item.price_caliente.toFixed(2)}€</div>
                    <button class="order-btn" style="width: auto; padding: 10px 20px; margin: 0;" onclick="addToCart(event, '${item.type}', ${item.id}, 'caliente')">Añadir</button>
                </div>
            `;
        }

        const imageHTML = item.image ? `<img src="${item.image}" class="bocadillo-img" alt="${item.name}">` : '';

        return `
            <div class="bocadillo-card ${item.disponible === false ? 'agotado' : ''}" data-id="${item.id}" data-type="${item.type}">
                <div class="bocadillo-number">${item.number || ''}</div>
                <h3>${item.name}</h3>
                <p>${item.type === 'bocadillo' ? `Bocadillo de ${item.ingredients} ingredientes` : 'Complemento'}</p>
                ${priceHTML}
                ${imageHTML}
            </div>
        `;
    }).join('');

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let buttons = '';
    for (let i = 1; i <= totalPages; i++) {
        buttons += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }

    paginationContainer.innerHTML = `
        <div style="display: flex; justify-content: center; gap: 10px; margin-top: 40px; margin-bottom: 40px;">
            <button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>
            ${buttons}
            <button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>
        </div>
    `;
}

window.goToPage = function(page) {
    currentPage = page;
    renderMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Cart Logic
window.addToCart = function(event, type, id, temp = 'caliente') {
    if (!isShopOpen()) {
        showToast('Lo sentimos, el establecimiento está cerrado en este momento.\\nPor favor, revisa nuestros horarios.', 'error');
        return;
    }

    const item = menuItems.find(i => i.type === type && i.id === id);
    if (!item || item.disponible === false) return;

    const price = temp === 'frio' ? item.price_frio : item.price_caliente;
    const existing = cart.find(c => c.type === type && c.id === id && c.temp === temp);
    
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ 
            ...item, 
            basePrice: price, 
            price: price, 
            temp: temp, 
            quantity: 1,
            pan_obrador: false,
            selectedExtras: [] // Array para guardar los extras específicos
        });
    }

    saveCart();
    updateCartUI();
    
    // Feedback animation
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = '¡Añadido! ✓';
    btn.style.background = '#ffb703';
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = '#f8f9fa';
    }, 1000);
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
};

window.togglePanObrador = function(index) {
    const item = cart[index];
    item.pan_obrador = !item.pan_obrador;
    recalculateItemPrice(index);
    saveCart();
    updateCartUI();
};

window.addExtraToItem = function(itemIndex, extraId) {
    if (!extraId) return;
    const item = cart[itemIndex];
    
    // Buscar en la lista de la foto
    let extra = PHOTO_EXTRAS.salsas.find(s => s.id === extraId);
    if (!extra) extra = PHOTO_EXTRAS.extras.find(e => e.id === extraId);
    
    if (extra) {
        item.selectedExtras.push({
            id: extra.id,
            name: extra.name,
            price: extra.price
        });
        recalculateItemPrice(itemIndex);
        saveCart();
        updateCartUI();
    }
};

window.removeExtraFromItem = function(itemIndex, extraIndex) {
    cart[itemIndex].selectedExtras.splice(extraIndex, 1);
    recalculateItemPrice(itemIndex);
    saveCart();
    updateCartUI();
};

function recalculateItemPrice(index) {
    const item = cart[index];
    let extraTotal = 0;
    
    if (item.pan_obrador) extraTotal += EXTRAS.pan_obrador.price;
    
    item.selectedExtras.forEach(e => {
        extraTotal += e.price;
    });
    
    item.price = item.basePrice + extraTotal;
}

window.clearCart = function() {
    if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
        cart = [];
        saveCart();
        updateCartUI();
    }
};

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
    if (!cartItemsList) return;

    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartCountLabel.innerText = count;
    cartTotalLabel.innerText = `${total.toFixed(2)}€`;

    if (cart.length === 0) {
        cartItemsList.innerHTML = `<p style="text-align: center; opacity: 0.5;">Tu carrito está vacío.</p>`;
        if (document.getElementById('pickup-time-container')) {
            document.getElementById('pickup-time-container').style.display = 'none';
        }
    } else {
        if (document.getElementById('pickup-time-container')) {
            document.getElementById('pickup-time-container').style.display = 'block';
        }
        cartItemsList.innerHTML = cart.map((item, index) => {
            let extrasHTML = '';
            if (item.type === 'bocadillo') {
                const selectedExtrasList = (item.selectedExtras || []).map((e, ei) => `
                    <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; display: flex; align-items: center; gap: 8px; margin-bottom: 5px; border: 1px solid rgba(255,255,255,0.2); color: #fff;">
                        ${e.name} (+${e.price.toFixed(2)}€)
                        <b onclick="removeExtraFromItem(${index}, ${ei})" style="cursor: pointer; color: var(--primary); font-size: 1.1rem;">&times;</b>
                    </span>
                `).join('');

                extrasHTML = `
                    <div style="margin-top: 8px;">
                        <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                            <label style="font-size: 0.75rem; background: ${item.pan_obrador ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}; color: ${item.pan_obrador ? '#000' : '#fff'}; padding: 4px 8px; border-radius: 4px; cursor: pointer; border: 1px solid ${item.pan_obrador ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}; display: inline-flex; align-items: center; gap: 5px;">
                                <input type="checkbox" style="display: none;" onchange="togglePanObrador(${index})" ${item.pan_obrador ? 'checked' : ''}>
                                🥖 Pan Obrador (+0.30€)
                            </label>
                            
                            <select onchange="addExtraToItem(${index}, this.value); this.value='';" style="font-size: 0.75rem; padding: 6px; border-radius: 4px; border: 1px solid var(--secondary); background: #000; color: #fff; cursor: pointer; max-width: 160px;">
                                <option value="" style="background: #000;">+ Añadir Extra...</option>
                                <optgroup label="SALSAS (0.60€)" style="background: #111; color: var(--secondary);">
                                    ${PHOTO_EXTRAS.salsas.map(ex => `<option value="${ex.id}" style="background: #000; color: #fff;">${ex.name} (+${ex.price.toFixed(2)}€)</option>`).join('')}
                                </optgroup>
                                <optgroup label="EXTRAS (Varios)" style="background: #111; color: var(--secondary);">
                                    ${PHOTO_EXTRAS.extras.map(ex => `<option value="${ex.id}" style="background: #000; color: #fff;">${ex.name} (+${ex.price.toFixed(2)}€)</option>`).join('')}
                                </optgroup>
                            </select>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                            ${selectedExtrasList}
                        </div>
                    </div>
                `;
            }

            return `
                <div style="display: flex; flex-direction: column; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600;">${item.name} ${item.temp === 'frio' ? '❄️' : '♨️'}</div>
                            <div style="font-size: 0.8rem; color: #666;">${item.quantity} x ${item.price.toFixed(2)}€</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <span style="font-weight: 700;">${(item.price * item.quantity).toFixed(2)}€</span>
                            <button onclick="removeFromCart(${index})" style="background: none; border: none; color: #e63946; cursor: pointer; font-size: 1.2rem;">&times;</button>
                        </div>
                    </div>
                    ${extrasHTML}
                </div>
            `;
        }).join('');
    }
}

// Event Listeners
function setupFilters() {
    if (!categoryFilters) return;
    
    categoryFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.category;
            currentPage = 1; // Reset to page 1 on filter
            renderMenu();
        }
    });
}

if (cartToggle) {
    cartToggle.onclick = () => {
        cartModal.style.display = 'flex';
        checkActiveOrders();
    };
}

if (closeModal) {
    closeModal.onclick = () => cartModal.style.display = 'none';
}

window.onclick = (e) => {
    if (e.target === cartModal) cartModal.style.display = 'none';
};

    if (checkoutBtn) {
        checkoutBtn.onclick = async () => {
            if (cart.length === 0) return showToast('El carrito está vacío', 'error');
            
            const pickupTime = document.getElementById('pickup-time').value;
            if (!pickupTime) {
                showToast('Por favor, indica la hora a la que vendrás a recoger tu pedido.', 'error');
                return;
            }

        checkoutBtn.disabled = true;
        checkoutBtn.innerText = 'Procesando...';

        try {
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            // Recopilar extras para las notas del pedido
            const notasExtras = cart.map(item => {
                if (item.selectedExtras && item.selectedExtras.length > 0) {
                    return `${item.name}: ${item.selectedExtras.map(e => e.name).join(', ')}`;
                }
                return null;
            }).filter(n => n !== null).join(' | ');

            // Obtener el ID del cliente si está logueado
            let idCliente = null;
            if (currentUser) {
                const { data: cData } = await supabaseClient
                    .from('cliente')
                    .select('id_cliente')
                    .eq('email', currentUser.email)
                    .single();
                if (cData) idCliente = cData.id_cliente;
            }

            // Generar código de recogida de 4 caracteres
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let codigoRecogida = '';
            for (let i = 0; i < 4; i++) {
                codigoRecogida += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            // 1. Insert into pedido
            const { data: pedidoData, error: pedidoError } = await supabaseClient
                .from('pedido')
                .insert([{
                    tipo: 'para_llevar',
                    total: total,
                    metodo_pago: 'en_tienda',
                    notas: notasExtras || 'Sin extras especiales',
                    hora_recogida: pickupTime,
                    id_cliente: idCliente,
                    codigo_recogida: codigoRecogida
                }])
                .select();
                
            if (pedidoError) throw pedidoError;
            if (!pedidoData || pedidoData.length === 0) throw new Error('No se pudo recuperar la información del pedido tras la inserción.');
            
            const idPedido = pedidoData[0].id_pedido;
            
            // 2. Insert into linea_pedido
            const lineas = cart.map(item => {
                const linea = {
                    id_pedido: idPedido,
                    tipo_item: item.type,
                    cantidad: item.quantity,
                    precio_unitario: item.price,
                    subtotal: item.price * item.quantity,
                    pan_obrador: false,
                    con_salsa: false
                };
                
                if (item.type === 'bocadillo') {
                    linea.id_bocadillo = item.id;
                    linea.temperatura = item.temp;
                    linea.pan_obrador = item.pan_obrador || false;
                    // Guardamos los nombres de los extras seleccionados en el campo notas o similar si es necesario
                    // Por ahora, el precio ya está sumado en precio_unitario
                    if (item.selectedExtras && item.selectedExtras.length > 0) {
                        linea.con_salsa = true; // Marcamos que lleva extras/salsa
                    }
                } else {
                    linea.id_producto = item.id;
                }
                
                return linea;
            });
            
            const { error: lineasError } = await supabaseClient
                .from('linea_pedido')
                .insert(lineas);
                
            if (lineasError) throw lineasError;
            
            let msg = '¡Gracias por tu pedido!\n\n';
            if (currentUser && currentUser.user_metadata.full_name) {
                msg = `¡Gracias por tu pedido, ${currentUser.user_metadata.full_name.split(' ')[0]}!\n\n`;
            }
            msg += `Tu código de recogida es: **${codigoRecogida}**\n\n`;
            msg += 'Guarda este código. Te esperamos en la tienda a las ' + pickupTime + ' para recogerlo y realizar el pago.';
            
            // Guardar el código en localStorage para seguimiento activo
            let activeCodes = JSON.parse(localStorage.getItem('active_orders') || '[]');
            activeCodes.push(codigoRecogida);
            localStorage.setItem('active_orders', JSON.stringify(activeCodes));
            checkActiveOrders();

            showToast(msg, 'success');
            cart = [];
            saveCart();
            updateCartUI();
            cartModal.style.display = 'none';
        } catch (error) {
            console.error('Error detallado procesando el pedido:', error);
            const errorMessage = error.message || error.details || JSON.stringify(error);
            showToast('Hubo un error al procesar tu pedido: ' + errorMessage, 'error');
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.innerText = 'Confirmar Pedido (Pago en Tienda)';
        }
    };
}

// Run init
init();

// Auth Logic
function setupAuth() {
    const authModal = document.getElementById('auth-modal');
    const openAuthBtn = document.getElementById('open-auth-modal');
    const closeAuthBtn = document.getElementById('close-auth-modal');
    const toggleToRegister = document.getElementById('toggle-to-register');
    const toggleToLogin = document.getElementById('toggle-to-login');
    const toggleToReset = document.getElementById('toggle-to-reset');
    const backToLogin = document.getElementById('back-to-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const resetForm = document.getElementById('reset-password-form');
    const authTitle = document.getElementById('auth-title');
    const logoutBtn = document.getElementById('logout-btn');

    if (!authModal) return;

    // Toggle Modal
    openAuthBtn.onclick = () => authModal.style.display = 'flex';
    if (closeAuthBtn) closeAuthBtn.onclick = () => authModal.style.display = 'none';
    
    const closeAuthModalSpan = document.getElementById('close-auth-modal');
    if (closeAuthModalSpan) closeAuthModalSpan.onclick = () => authModal.style.display = 'none';

    window.addEventListener('click', (e) => {
        if (e.target === authModal) authModal.style.display = 'none';
    });

    // Toggle Forms
    if (toggleToRegister) {
        toggleToRegister.onclick = (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            resetForm.style.display = 'none';
            registerForm.style.display = 'block';
            authTitle.innerText = 'Crear Cuenta';
        };
    }

    if (toggleToLogin) {
        toggleToLogin.onclick = (e) => {
            e.preventDefault();
            registerForm.style.display = 'none';
            resetForm.style.display = 'none';
            loginForm.style.display = 'block';
            authTitle.innerText = 'Iniciar Sesión';
        };
    }

    if (toggleToReset) {
        toggleToReset.onclick = (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'none';
            resetForm.style.display = 'block';
            authTitle.innerText = 'Recuperar Contraseña';
        };
    }

    if (backToLogin) {
        backToLogin.onclick = (e) => {
            e.preventDefault();
            resetForm.style.display = 'none';
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            authTitle.innerText = 'Iniciar Sesión';
        };
    }

    // Sign Up
    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const phone = document.getElementById('reg-phone').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name, phone: phone }
                }
            });

            if (error) {
                showToast('Error en el registro: ' + error.message, 'error');
            } else {
                // Guardar en nuestra tabla publica de clientes
                const { error: dbError } = await supabaseClient
                    .from('cliente')
                    .insert([{
                        nombre: name,
                        telefono: phone,
                        email: email,
                        es_registrado: true,
                        fecha_registro: new Date().toISOString()
                    }]);
                
                if (dbError) console.error('Error syncing to public.cliente:', dbError);

                showToast('¡Registro iniciado! Por favor, revisa tu correo electrónico para verificar tu cuenta antes de entrar.', 'success');
                authModal.style.display = 'none';
            }
        };
    }

    // Sign In
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                showToast('Error al entrar: ' + error.message, 'error');
            } else {
                authModal.style.display = 'none';
                loginForm.reset();
            }
        };
    }

    // Reset Password
    if (resetForm) {
        resetForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/index.html',
            });

            if (error) {
                showToast('Error: ' + error.message, 'error');
            } else {
                showToast('¡Enlace enviado! Revisa tu correo electrónico para restablecer tu contraseña.', 'success');
                resetForm.style.display = 'none';
                loginForm.style.display = 'block';
                authTitle.innerText = 'Iniciar Sesión';
            }
        };
    }

    // Sign Out
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await supabaseClient.auth.signOut();
        };
    }

    // Listen for Auth Changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        updateAuthUI();
    });
}

function updateAuthUI() {
    const authNav = document.getElementById('auth-nav-item');
    const userNav = document.getElementById('user-nav-item');
    const userNameDisplay = document.getElementById('user-name-display');

    if (!authNav || !userNav) return;

    if (currentUser) {
        authNav.style.display = 'none';
        userNav.style.display = 'flex';
        userNav.style.alignItems = 'center';
        
        // Verificar si es admin para mostrar el link al panel
        checkAdminStatus();

        userNameDisplay.innerText = `Hola, ${currentUser.user_metadata.full_name || currentUser.email.split('@')[0]}`;
    } else {
        authNav.style.display = 'block';
        userNav.style.display = 'none';
        
        // Quitar link de admin si existe
        const adminLink = document.getElementById('admin-nav-link');
        if (adminLink) adminLink.remove();
    }
}

async function checkAdminStatus() {
    if (!currentUser) return;
    
    const { data: profile } = await supabaseClient
        .from('cliente')
        .select('es_admin')
        .eq('email', currentUser.email)
        .single();
    
    if (profile && profile.es_admin) {
        // Añadir link al panel si no existe
        if (!document.getElementById('admin-nav-link')) {
            const navUl = document.querySelector('nav ul');
            const li = document.createElement('li');
            li.id = 'admin-nav-link';
            li.innerHTML = `<a href="admin.html" style="color: var(--accent); font-weight: 900; border: 1px solid var(--accent); padding: 5px 10px; border-radius: 4px; font-size: 0.7rem; margin-left: 10px;">PANEL ADMIN</a>`;
            navUl.insertBefore(li, document.getElementById('user-nav-item'));
        }
    }
}

// Intro Animation Logic
document.addEventListener('DOMContentLoaded', () => {
    const intro = document.getElementById('intro-screen');
    if (intro) {
        setTimeout(() => {
            intro.remove();
        }, 3000);
    }

    // Hamburger Menu Toggle
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navEl = document.querySelector('header nav');
    if (hamburgerBtn && navEl) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navEl.classList.toggle('open');
            hamburgerBtn.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!hamburgerBtn.contains(e.target) && !navEl.contains(e.target)) {
                navEl.classList.remove('open');
                hamburgerBtn.classList.remove('active');
            }
        });
        // Close on nav link click
        navEl.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('click', () => {
                navEl.classList.remove('open');
                hamburgerBtn.classList.remove('active');
            });
        });
    }
});