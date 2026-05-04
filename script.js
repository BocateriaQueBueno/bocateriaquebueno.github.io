// Configuration
const SUPABASE_URL = 'https://qcwrccquctttqniketby.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd3JjY3F1Y3R0dHFuaWtldGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjgzOTIsImV4cCI6MjA5MzAwNDM5Mn0.R_tLtoaPRczxD1LVvArq2HFHzer1jWeOpJK_o9hPDr0';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let menuItems = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentFilter = 'all';

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
            category: 'extras'
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

    menuGrid.innerHTML = filtered.map(item => {
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
}

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
            price: price, 
            temp: temp, 
            quantity: 1 
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
        cartItemsList.innerHTML = cart.map((item, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <div>
                    <div style="font-weight: 600;">${item.name} ${item.temp === 'frio' ? '❄️' : '♨️'}</div>
                    <div style="font-size: 0.8rem; color: #666;">${item.quantity} x ${item.price.toFixed(2)}€</div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-weight: 700;">${(item.price * item.quantity).toFixed(2)}€</span>
                    <button onclick="removeFromCart(${index})" style="background: none; border: none; color: #e63946; cursor: pointer; font-size: 1.2rem;">&times;</button>
                </div>
            </div>
        `).join('');
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
            
            // 1. Insert into pedido
            const { data: pedidoData, error: pedidoError } = await supabaseClient
                .from('pedido')
                .insert([{
                    tipo: 'para_llevar',
                    total: total,
                    metodo_pago: 'en_tienda'
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