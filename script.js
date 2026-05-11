// Configuration
const SUPABASE_URL = 'https://qcwrccquctttqniketby.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd3JjY3F1Y3R0dHFuaWtldGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjgzOTIsImV4cCI6MjA5MzAwNDM5Mn0.R_tLtoaPRczxD1LVvArq2HFHzer1jWeOpJK_o9hPDr0';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

// State
let menuItems = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentFilter = 'all';
let currentPage = 1;
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
    if (menuGrid) {
        await loadMenu();
        renderMenu();
        setupFilters();
    }
    updateCartUI();
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
        const bFormatted = bocadillos.map(b => ({
            id: b.id_bocadillo,
            type: 'bocadillo',
            name: b.nombre,
            number: b.numero_menu,
            ingredients: b.num_ingredientes,
            price_caliente: Number(b.precio_caliente),
            price_frio: b.precio_frio ? Number(b.precio_frio) : null,
            category: getBocadilloCategory(b.num_ingredientes)
        }));

        const pFormatted = productos.map(p => ({
            id: p.id_producto,
            type: 'producto',
            name: p.nombre,
            price_caliente: Number(p.precio),
            price_frio: null,
            category: p.id_categoria === 1 ? 'bebidas' : (p.id_categoria === 2 ? 'extras' : 'salsas') // Mapeo básico de categorías
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
        if (item.price_frio) {
            priceHTML = `
                <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f0f7ff; padding: 8px 12px; border-radius: 8px;">
                        <span>❄️ ${item.price_frio.toFixed(2)}€</span>
                        <button class="order-btn" style="margin: 0; width: auto; padding: 5px 15px;" onclick="addToCart(event, '${item.type}', ${item.id}, 'frio')">Añadir</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #fff0f0; padding: 8px 12px; border-radius: 8px;">
                        <span>♨️ ${item.price_caliente.toFixed(2)}€</span>
                        <button class="order-btn" style="margin: 0; width: auto; padding: 5px 15px;" onclick="addToCart(event, '${item.type}', ${item.id}, 'caliente')">Añadir</button>
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

        return `
            <div class="bocadillo-card" data-id="${item.id}" data-type="${item.type}">
                <div class="bocadillo-number">${item.number || ''}</div>
                <h3>${item.name}</h3>
                <p>${item.type === 'bocadillo' ? `Bocadillo de ${item.ingredients} ingredientes` : 'Complemento'}</p>
                ${priceHTML}
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
    const item = menuItems.find(i => i.type === type && i.id === id);
    if (!item) return;

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
    } else {
        cartItemsList.innerHTML = cart.map((item, index) => {
            let extrasHTML = '';
            if (item.type === 'bocadillo') {
                const selectedExtrasList = (item.selectedExtras || []).map((e, ei) => `
                    <span style="background: #e9ecef; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; display: flex; align-items: center; gap: 5px; margin-bottom: 2px;">
                        ${e.name} (+${e.price.toFixed(2)}€)
                        <b onclick="removeExtraFromItem(${index}, ${ei})" style="cursor: pointer; color: #e63946;">&times;</b>
                    </span>
                `).join('');

                extrasHTML = `
                    <div style="margin-top: 8px;">
                        <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                            <label style="font-size: 0.75rem; background: ${item.pan_obrador ? '#ffb703' : '#f0f0f0'}; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                                <input type="checkbox" style="display: none;" onchange="togglePanObrador(${index})" ${item.pan_obrador ? 'checked' : ''}>
                                🥖 Pan Obrador (+0.30€)
                            </label>
                            
                            <select onchange="addExtraToItem(${index}, this.value); this.value='';" style="font-size: 0.75rem; padding: 4px; border-radius: 4px; border: 1px solid #ddd; background: white; cursor: pointer; max-width: 150px;">
                                <option value="">+ Añadir de la Foto...</option>
                                <optgroup label="SALSAS (0.60€)">
                                    ${PHOTO_EXTRAS.salsas.map(ex => `<option value="${ex.id}">${ex.name} (+${ex.price.toFixed(2)}€)</option>`).join('')}
                                </optgroup>
                                <optgroup label="EXTRAS (Varios)">
                                    ${PHOTO_EXTRAS.extras.map(ex => `<option value="${ex.id}">${ex.name} (+${ex.price.toFixed(2)}€)</option>`).join('')}
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
    cartToggle.onclick = () => cartModal.style.display = 'flex';
}

if (closeModal) {
    closeModal.onclick = () => cartModal.style.display = 'none';
}

window.onclick = (e) => {
    if (e.target === cartModal) cartModal.style.display = 'none';
};

if (checkoutBtn) {
    checkoutBtn.onclick = async () => {
        if (cart.length === 0) return alert('El carrito está vacío');
        
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

            // 1. Insert into pedido
            const { data: pedidoData, error: pedidoError } = await supabaseClient
                .from('pedido')
                .insert([{
                    tipo: 'para_llevar',
                    total: total,
                    metodo_pago: 'en_tienda',
                    notas: notasExtras || 'Sin extras especiales'
                }])
                .select();
                
            if (pedidoError) throw pedidoError;
            
            const idPedido = pedidoData[0].id_pedido;
            
            // 2. Insert into linea_pedido
            const lineas = cart.map(item => {
                const linea = {
                    id_pedido: idPedido,
                    tipo_item: item.type,
                    cantidad: item.quantity,
                    precio_unitario: item.price,
                    subtotal: item.price * item.quantity
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
            
            alert('¡Gracias por tu pedido! Te esperamos en la tienda para recogerlo y realizar el pago.');
            cart = [];
            saveCart();
            updateCartUI();
            cartModal.style.display = 'none';
        } catch (error) {
            console.error('Error procesando el pedido:', error);
            alert('Hubo un error al procesar tu pedido. Por favor, inténtalo de nuevo.');
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.innerText = 'Confirmar Pedido (Pago en Tienda)';
        }
    };
}

// Run init
init();