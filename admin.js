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

let currentUser = null;
let currentEditType = null;
let currentEditId = null;
let allBocadillos = [];
let allProductos = [];
let pedidosInterval = null;

async function checkAdmin() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    const { data: profile } = await supabaseClient
        .from('cliente')
        .select('es_admin')
        .eq('email', session.user.email)
        .single();

    if (!profile || !profile.es_admin) {
        showToast('Acceso restringido: Solo administradores.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    currentUser = session.user;
    loadData();
}

function showSection(event, sectionId) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

async function loadData() {
    loadBocadillos();
    loadProductos();
    loadClientes();
    loadPedidos();
    if (!pedidosInterval) {
        pedidosInterval = setInterval(loadPedidos, 30000); // 30 seconds
    }
}

async function loadBocadillos() {
    const { data } = await supabaseClient.from('bocadillo').select('*').order('numero_menu');
    allBocadillos = data;
    const list = document.getElementById('admin-bocadillos-list');
    list.innerHTML = data.map(b => `
        <div class="admin-card">
            <div>
                <strong>#${b.numero_menu} - ${b.nombre}</strong><br>
                <small>${b.precio_caliente}€ | ${b.disponible ? 'Disponible' : 'Agotado'}</small>
                ${b.image_url ? `<br><img src="${b.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-top: 5px;">` : ''}
            </div>
            <div>
                <button class="action-btn ${b.disponible ? 'btn-disponible' : 'btn-no-disponible'}" onclick="toggleAvailability('bocadillo', ${b.id_bocadillo}, ${b.disponible})">
                    ${b.disponible ? 'Disponible' : 'Agotado'}
                </button>
                <button class="action-btn btn-edit" onclick="openAddModal('bocadillo', ${b.id_bocadillo})">Editar</button>
                <button class="action-btn btn-delete" onclick="deleteItem('bocadillo', ${b.id_bocadillo})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

async function loadProductos() {
    const { data } = await supabaseClient.from('producto').select('*');
    allProductos = data;
    const list = document.getElementById('admin-productos-list');
    list.innerHTML = data.map(p => `
        <div class="admin-card">
            <div>
                <strong>${p.nombre}</strong><br>
                <small>${p.precio}€ | ${p.disponible ? 'Disponible' : 'Agotado'}</small>
                ${p.image_url ? `<br><img src="${p.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-top: 5px;">` : ''}
            </div>
            <div>
                <button class="action-btn ${p.disponible ? 'btn-disponible' : 'btn-no-disponible'}" onclick="toggleAvailability('producto', ${p.id_producto}, ${p.disponible})">
                    ${p.disponible ? 'Disponible' : 'Agotado'}
                </button>
                <button class="action-btn btn-edit" onclick="openAddModal('producto', ${p.id_producto})">Editar</button>
                <button class="action-btn btn-delete" onclick="deleteItem('producto', ${p.id_producto})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

async function loadClientes() {
    const { data, error } = await supabaseClient.from('cliente').select('*, pedido(*)');
    if (error) {
        console.error('Error cargando clientes:', error);
        showToast('Error cargando clientes: ' + error.message, 'error');
        return;
    }
    console.log('Clientes cargados:', data);
    const list = document.getElementById('admin-clientes-list');
    list.innerHTML = data.map(c => {
        const pedidos = c.pedido || [];
        pedidos.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)); // Más recientes primero
        
        const pedidosHtml = pedidos.length > 0 
            ? `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                <strong>Historial de Pedidos (${pedidos.length}):</strong>
                <ul style="list-style: none; padding: 0; margin-top: 5px; font-size: 0.85rem; color: #bbb; max-height: 120px; overflow-y: auto;">
                    ${pedidos.map(p => `<li style="margin-bottom: 3px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 4px;">• Pedido #${p.id_pedido} | ${new Date(p.fecha_hora).toLocaleDateString()} | <strong>${p.total}€</strong> | <span style="color: ${p.estado === 'cancelado' ? '#e63946' : (p.estado === 'listo' || p.estado === 'entregado' ? '#2a9d8f' : '#ffb703')}">${p.estado}</span></li>`).join('')}
                </ul>
               </div>`
            : '<div style="margin-top: 10px; font-size: 0.85rem; color: #888; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">Sin pedidos realizados todavía.</div>';

        return `
        <div class="admin-card" style="flex-direction: column; align-items: stretch; gap: 5px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <strong>${c.nombre}</strong> (${c.email})<br>
                    <small>Tlf: ${c.telefono} | ${c.es_admin ? 'ADMIN' : 'Cliente'}</small>
                </div>
                <div>
                    ${!c.es_admin ? `<button class="action-btn btn-delete" onclick="deleteItem('cliente', ${c.id_cliente})">Banear</button>` : ''}
                </div>
            </div>
            ${pedidosHtml}
        </div>
        `;
    }).join('');
}

async function deleteItem(table, id) {
    if (!confirm('¿Estás seguro de eliminar este elemento?')) return;
    
    const idField = table === 'bocadillo' ? 'id_bocadillo' : (table === 'producto' ? 'id_producto' : 'id_cliente');
    
    const { error } = await supabaseClient.from(table).delete().eq(idField, id);
    if (error) showToast('Error al borrar: ' + error.message, 'error');
    else {
        showToast('Eliminado correctamente', 'success');
        loadData();
    }
}

async function toggleAvailability(table, id, currentStatus) {
    const idField = table === 'bocadillo' ? 'id_bocadillo' : 'id_producto';
    const { error } = await supabaseClient
        .from(table)
        .update({ disponible: !currentStatus })
        .eq(idField, id);
        
    if (error) {
        showToast('Error al actualizar disponibilidad: ' + error.message, 'error');
    } else {
        showToast('Disponibilidad actualizada', 'success');
        loadData();
    }
}

function openAddModal(type, id = null) {
    currentEditType = type;
    currentEditId = id;
    const modal = document.getElementById('admin-modal');
    const fields = document.getElementById('form-fields');
    document.getElementById('modal-title').innerText = id ? 'Editar Item' : 'Añadir Item';
    modal.style.display = 'flex';
    
    let item = null;
    if (id) {
        item = type === 'bocadillo' ? allBocadillos.find(b => b.id_bocadillo === id) : allProductos.find(p => p.id_producto === id);
    }
    
    if (type === 'bocadillo') {
        fields.innerHTML = `
            <div class="form-group"><label>Número Menú</label><input type="number" id="f-num" value="${item?.numero_menu || ''}" required></div>
            <div class="form-group"><label>Nombre</label><input type="text" id="f-name" value="${item?.nombre || ''}" required></div>
            <div class="form-group"><label>Nº Ingredientes</label><input type="number" id="f-ing" value="${item?.num_ingredientes || ''}" required></div>
            <div class="form-group"><label>Precio Caliente</label><input type="number" step="0.01" id="f-pcal" value="${item?.precio_caliente || ''}" required></div>
            <div class="form-group"><label>Precio Frío (Opcional)</label><input type="number" step="0.01" id="f-pfrio" value="${item?.precio_frio || ''}"></div>
            <div class="form-group"><label>URL Imagen (Opcional)</label><input type="text" id="f-img" value="${item?.image_url || ''}"></div>
            <div class="form-group">
                <label>Disponible</label>
                <select id="f-disp">
                    <option value="true" ${item?.disponible !== false ? 'selected' : ''}>Sí</option>
                    <option value="false" ${item?.disponible === false ? 'selected' : ''}>No</option>
                </select>
            </div>
        `;
    } else if (type === 'producto') {
        fields.innerHTML = `
            <div class="form-group"><label>Nombre</label><input type="text" id="f-name" value="${item?.nombre || ''}" required></div>
            <div class="form-group"><label>Precio</label><input type="number" step="0.01" id="f-price" value="${item?.precio || ''}" required></div>
            <div class="form-group">
                <label>Categoría</label>
                <select id="f-cat" required>
                    <option value="1" ${item?.id_categoria === 1 ? 'selected' : ''}>Bebidas</option>
                    <option value="2" ${item?.id_categoria === 2 ? 'selected' : ''}>Patatas / Snacks</option>
                    <option value="3" ${item?.id_categoria === 3 ? 'selected' : ''}>Dulces / Postres</option>
                    <option value="4" ${item?.id_categoria === 4 ? 'selected' : ''}>Otros</option>
                </select>
            </div>
            <div class="form-group"><label>URL Imagen (Opcional)</label><input type="text" id="f-img" value="${item?.image_url || ''}"></div>
            <div class="form-group">
                <label>Disponible</label>
                <select id="f-disp">
                    <option value="true" ${item?.disponible !== false ? 'selected' : ''}>Sí</option>
                    <option value="false" ${item?.disponible === false ? 'selected' : ''}>No</option>
                </select>
            </div>
        `;
    }
}

document.getElementById('admin-form').onsubmit = async (e) => {
    e.preventDefault();
    const type = currentEditType;
    
    let payload = {};
    if (type === 'bocadillo') {
        const pfrioVal = document.getElementById('f-pfrio').value;
        payload = {
            numero_menu: document.getElementById('f-num').value,
            nombre: document.getElementById('f-name').value,
            num_ingredientes: document.getElementById('f-ing').value,
            precio_caliente: document.getElementById('f-pcal').value,
            precio_frio: pfrioVal === "" ? null : pfrioVal,
            image_url: document.getElementById('f-img').value || null,
            disponible: document.getElementById('f-disp').value === 'true'
        };
    } else if (type === 'producto') {
        payload = {
            nombre: document.getElementById('f-name').value,
            precio: document.getElementById('f-price').value,
            id_categoria: document.getElementById('f-cat').value,
            image_url: document.getElementById('f-img').value || null,
            disponible: document.getElementById('f-disp').value === 'true'
        };
    }

    let error;
    if (currentEditId) {
        const idField = type === 'bocadillo' ? 'id_bocadillo' : 'id_producto';
        const res = await supabaseClient.from(type).update(payload).eq(idField, currentEditId);
        error = res.error;
    } else {
        const res = await supabaseClient.from(type).insert([payload]);
        error = res.error;
    }
    
    if (error) showToast('Error al guardar: ' + error.message, 'error');
    else {
        showToast('Guardado correctamente', 'success');
        closeAdminModal();
        loadData();
    }
};

async function loadPedidos() {
    const { data, error } = await supabaseClient
        .from('pedido')
        .select('*, cliente(nombre, telefono), linea_pedido(*, bocadillo(nombre), producto(nombre))')
        .order('fecha_hora', { ascending: false })
        .limit(50);
        
    if (error) {
        console.error('Error loading pedidos', error);
        return;
    }
    
    const list = document.getElementById('admin-pedidos-list');
    if (!list) return;
    
    list.innerHTML = data.map(p => {
        let statusColor = '#888';
        if (p.estado === 'preparando') statusColor = '#ffb703';
        if (p.estado === 'listo' || p.estado === 'entregado') statusColor = '#2a9d8f';
        if (p.estado === 'cancelado') statusColor = '#e63946';

        const clientName = p.cliente ? p.cliente.nombre : 'Cliente Anónimo';
        const clientPhone = p.cliente ? p.cliente.telefono : '';
        const waLink = clientPhone ? `https://wa.me/34${clientPhone.trim().replace(/\s+/g, '')}?text=¡Hola%20${encodeURIComponent(clientName.split(' ')[0])}!%20Tu%20pedido%20con%20código%20*${p.codigo_recogida || ''}*%20ya%20está%20listo%20para%20recoger%20en%20Bocatería%20Qué%20Bueno.%20¡Te%20esperamos!` : '';

        const lineas = p.linea_pedido || [];
        const itemsHtml = lineas.map(l => {
            const name = l.tipo_item === 'bocadillo' 
                ? (l.bocadillo ? l.bocadillo.nombre : 'Bocadillo') 
                : (l.producto ? l.producto.nombre : 'Producto');
            
            const details = [];
            if (l.tipo_item === 'bocadillo') {
                if (l.temperatura) details.push(l.temperatura === 'caliente' ? '🔥 Caliente' : '❄️ Frío');
                if (l.pan_obrador) details.push('🥖 Pan Obrador (+0.30€)');
                if (l.con_salsa) details.push('🍯 Con Salsa');
            }
            
            const detailsStr = details.length > 0 ? ` <span style="font-size: 0.8rem; color: var(--secondary);">(${details.join(', ')})</span>` : '';
            return `<div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; color: #fff;">
                <strong>x${l.cantidad}</strong> ${name}${detailsStr} - <span style="color: #aaa;">${Number(l.precio_unitario).toFixed(2)}€/ud</span>
            </div>`;
        }).join('');

        return `
            <div class="admin-card" style="border-left: 4px solid ${statusColor}; flex-direction: column; align-items: flex-start; gap: 10px;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                    <div>
                        <strong>Pedido #${p.id_pedido}</strong> - <span style="color: ${statusColor}; text-transform: uppercase; font-size: 0.8rem; font-weight: 900;">${p.estado}</span>
                        <div style="margin-top: 5px;"><strong style="background: var(--primary); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.9rem; letter-spacing: 1px;">CÓDIGO: ${p.codigo_recogida || 'N/A'}</strong></div>
                        <div style="font-size: 0.85rem; color: #aaa; margin-top: 5px;">${new Date(p.fecha_hora).toLocaleString()} | ${p.tipo === 'local' ? 'En Local' : 'Para Llevar'} ${p.hora_recogida ? `(Recoger: ${p.hora_recogida})` : ''}</div>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: var(--primary); font-size: 1.2rem;">${p.total}€</strong>
                    </div>
                </div>
                
                <div style="font-size: 0.9rem; background: rgba(0,0,0,0.5); padding: 12px; border-radius: 6px; width: 100%; display: flex; flex-direction: column; gap: 6px;">
                    <div>👤 <strong>${clientName}</strong> ${clientPhone ? `(${clientPhone}) <a href="https://wa.me/34${clientPhone.trim().replace(/\s+/g, '')}" target="_blank" style="color: #25D366; margin-left: 8px; font-size: 1.1rem; text-decoration: none; display: inline-flex; align-items: center; vertical-align: middle;" title="Abrir chat de WhatsApp"><i class="fab fa-whatsapp"></i></a>` : ''}</div>
                    
                    <div style="margin-top: 5px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                        <strong style="color: var(--secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">🥪 Artículos a preparar:</strong>
                        <div style="margin-top: 5px;">${itemsHtml || '<span style="color:#888;">Sin detalles de artículos</span>'}</div>
                    </div>
                    
                    ${p.notas ? `<div style="margin-top: 5px; color: #ccc; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">📝 <strong>Notas/Extras:</strong> ${p.notas}</div>` : ''}
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 5px; align-items: center; width: 100%; flex-wrap: wrap;">
                    ${p.estado === 'pendiente' ? `<button class="action-btn" style="background: #ffb703; color: #000;" onclick="updatePedidoStatus(${p.id_pedido}, 'preparando')">Marcar En Marcha</button>` : ''}
                    ${p.estado === 'preparando' ? `<button class="action-btn" style="background: #2a9d8f; color: #fff;" onclick="updatePedidoStatus(${p.id_pedido}, 'completado')">Marcar Completado</button>` : ''}
                    ${p.estado !== 'cancelado' && p.estado !== 'entregado' && p.estado !== 'listo' ? `<button class="action-btn btn-delete" onclick="updatePedidoStatus(${p.id_pedido}, 'cancelado')">Cancelar</button>` : ''}
                    ${clientPhone && p.estado === 'preparando' ? `<a href="${waLink}" target="_blank" class="action-btn" style="background: #25D366; color: #fff; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; border-radius: 4px; padding: 6px 12px; font-weight: 700; font-size: 0.85rem;"><i class="fab fa-whatsapp" style="font-size: 1rem;"></i> Avisar</a>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function updatePedidoStatus(id, estadoUI) {
    let nuevoEstado = estadoUI;
    if (estadoUI === 'completado') nuevoEstado = 'listo'; // Según ENUM: 'listo' o 'entregado'. Usamos listo para completado.
    
    const { error } = await supabaseClient.from('pedido').update({ estado: nuevoEstado }).eq('id_pedido', id);
    if (error) showToast('Error al actualizar pedido: ' + error.message, 'error');
    else {
        showToast('Estado de pedido actualizado', 'success');
        loadPedidos();
    }
}

function closeAdminModal() {
    document.getElementById('admin-modal').style.display = 'none';
}

document.getElementById('logout-btn').onclick = async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
};

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (!session) window.location.href = 'index.html';
});

checkAdmin();
