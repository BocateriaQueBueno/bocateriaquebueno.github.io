const SUPABASE_URL = 'https://qcwrccquctttqniketby.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd3JjY3F1Y3R0dHFuaWtldGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjgzOTIsImV4cCI6MjA5MzAwNDM5Mn0.R_tLtoaPRczxD1LVvArq2HFHzer1jWeOpJK_o9hPDr0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentEditType = null;
let currentEditId = null;

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
        alert('Acceso restringido: Solo administradores.');
        window.location.href = 'index.html';
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
}

async function loadBocadillos() {
    const { data } = await supabaseClient.from('bocadillo').select('*').order('numero_menu');
    const list = document.getElementById('admin-bocadillos-list');
    list.innerHTML = data.map(b => `
        <div class="admin-card">
            <div>
                <strong>#${b.numero_menu} - ${b.nombre}</strong><br>
                <small>${b.precio_caliente}€ | ${b.disponible ? 'Disponible' : 'Agotado'}</small>
            </div>
            <div>
                <button class="action-btn btn-delete" onclick="deleteItem('bocadillo', ${b.id_bocadillo})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

async function loadProductos() {
    const { data } = await supabaseClient.from('producto').select('*');
    const list = document.getElementById('admin-productos-list');
    list.innerHTML = data.map(p => `
        <div class="admin-card">
            <div>
                <strong>${p.nombre}</strong><br>
                <small>${p.precio}€</small>
            </div>
            <div>
                <button class="action-btn btn-delete" onclick="deleteItem('producto', ${p.id_producto})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

async function loadClientes() {
    const { data } = await supabaseClient.from('cliente').select('*');
    const list = document.getElementById('admin-clientes-list');
    list.innerHTML = data.map(c => `
        <div class="admin-card">
            <div>
                <strong>${c.nombre}</strong> (${c.email})<br>
                <small>Tlf: ${c.telefono} | ${c.es_admin ? 'ADMIN' : 'Cliente'}</small>
            </div>
            <div>
                ${!c.es_admin ? `<button class="action-btn btn-delete" onclick="deleteItem('cliente', ${c.id_cliente})">Banear</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function deleteItem(table, id) {
    if (!confirm('¿Estás seguro de eliminar este elemento?')) return;
    
    const idField = table === 'bocadillo' ? 'id_bocadillo' : (table === 'producto' ? 'id_producto' : 'id_cliente');
    
    const { error } = await supabaseClient.from(table).delete().eq(idField, id);
    if (error) alert('Error al borrar: ' + error.message);
    else loadData();
}

function openAddModal(type) {
    currentEditType = type;
    const modal = document.getElementById('admin-modal');
    const fields = document.getElementById('form-fields');
    modal.style.display = 'flex';
    
    if (type === 'bocadillo') {
        fields.innerHTML = `
            <div class="form-group"><label>Número Menú</label><input type="number" id="f-num" required></div>
            <div class="form-group"><label>Nombre</label><input type="text" id="f-name" required></div>
            <div class="form-group"><label>Nº Ingredientes</label><input type="number" id="f-ing" required></div>
            <div class="form-group"><label>Precio Caliente</label><input type="number" step="0.01" id="f-pcal" required></div>
            <div class="form-group"><label>Precio Frío (Opcional)</label><input type="number" step="0.01" id="f-pfrio"></div>
        `;
    } else if (type === 'producto') {
        fields.innerHTML = `
            <div class="form-group"><label>Nombre</label><input type="text" id="f-name" required></div>
            <div class="form-group"><label>Precio</label><input type="number" step="0.01" id="f-price" required></div>
            <div class="form-group">
                <label>Categoría</label>
                <select id="f-cat" required>
                    <option value="1">Bebidas</option>
                    <option value="2">Patatas / Snacks</option>
                    <option value="3">Dulces / Postres</option>
                    <option value="4">Otros</option>
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
            precio_frio: pfrioVal === "" ? null : pfrioVal
        };
    } else if (type === 'producto') {
        payload = {
            nombre: document.getElementById('f-name').value,
            precio: document.getElementById('f-price').value,
            id_categoria: document.getElementById('f-cat').value
        };
    }

    const { error } = await supabaseClient.from(type).insert([payload]);
    if (error) alert('Error al guardar: ' + error.message);
    else {
        closeAdminModal();
        loadData();
    }
};

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
