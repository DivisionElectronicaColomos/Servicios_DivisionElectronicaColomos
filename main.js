const API_URL = "https://script.google.com/macros/s/AKfycbz0qNhiq-g3FIfIlHlWOQdxgRtpu8d2dquOebHBJIl6MEmdkHshmE6_mIza_Td2jJVF/exec"; 
const CORREO_ADMIN = "division.electronica.colomos@gmail.com"; 

const EMAILJS_PUBLIC_KEY = "oJuqHFHQKp3fW14r2";
const EMAILJS_SERVICE_ID = "service_afe5viy";
const EMAILJS_TEMPLATE_ID = "template_kcb8uby";
emailjs.init(EMAILJS_PUBLIC_KEY);

let usuarioActual = ""; 
let nombreMostrado = "";
let esAdmin = false; 
let todosLosPedidos = [];

document.getElementById("btn-login").addEventListener("click", async () => {
    const inputAcceso = document.getElementById("email-login").value.trim().toLowerCase();
    
    if (!inputAcceso) {
        return Swal.fire({ icon: 'warning', title: 'Campo vacío', text: 'Por favor, ingresa tu correo electrónico.' });
    }

    const btn = document.getElementById("btn-login");
    btn.innerText = "Verificando..."; 
    btn.disabled = true;

    try {
        if (todosLosPedidos.length === 0) {
            const respuesta = await fetch(API_URL);
            todosLosPedidos = await respuesta.json();
        }

        if (inputAcceso === "admin") {
            usuarioActual = "admin"; 
            nombreMostrado = "Administrador";
            esAdmin = true;
        } else {
            const pedidoAlumno = todosLosPedidos.find(pedido => (pedido["Dirección de correo electrónico"] || "").toLowerCase() === inputAcceso);
            
            if (!pedidoAlumno) {
                btn.innerText = "Entrar"; btn.disabled = false;
                return Swal.fire({ icon: 'info', title: 'Sin registros', text: 'No se encontró ningún pedido registrado con este correo.' });
            }
            
            usuarioActual = inputAcceso; 
            esAdmin = false;
            nombreMostrado = pedidoAlumno["Nombre completo"] || inputAcceso;
        }
        
        document.getElementById("login-section").classList.add("hidden");
        document.getElementById("dashboard-section").classList.remove("hidden");
        
        document.getElementById("user-info").innerHTML = `Hola, <strong>${nombreMostrado}</strong>`;
        
        if (esAdmin) {
            document.getElementById("admin-controls").classList.remove("hidden");
            document.getElementById("col-acciones").classList.remove("hidden");
        }
        
        renderizarTabla(); 

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar con la base de datos.' });
        btn.innerText = "Entrar"; btn.disabled = false;
    }
});

document.getElementById("email-login").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("btn-login").click();
    }
});

document.getElementById("btn-logout").addEventListener("click", () => {
    Swal.fire({
        title: '¿Cerrar sesión?', icon: 'question', showCancelButton: true,
        confirmButtonColor: '#4F46E5', cancelButtonColor: '#d33', confirmButtonText: 'Sí, salir'
    }).then((result) => {
        if (result.isConfirmed) location.reload();
    });
});

function getClassPorEstado(estado) {
    if(estado === "En Proceso") return "status-en-proceso";
    if(estado === "Terminado") return "status-terminado";
    if(estado === "Entregado") return "status-entregado";
    return "status-pendiente";
}

function renderizarTabla() {
    const tbody = document.getElementById("tabla-body");
    tbody.innerHTML = "";
    const filtroEstado = document.getElementById("filter-estado").value;
    const filtroServicio = document.getElementById("filter-servicio").value;

    const pedidosFiltrados = todosLosPedidos.filter(pedido => {
        const correoRegistro = (pedido["Dirección de correo electrónico"] || "").toLowerCase();
        const esDelUsuario = esAdmin || correoRegistro === usuarioActual;
        const cumpleEstado = filtroEstado === "Todos" || (pedido["Estado"] || "Pendiente") === filtroEstado;
        const servicioStr = (pedido["¿Qué servicio necesitas?"] || "");
        const cumpleServicio = filtroServicio === "Todos" || servicioStr.includes(filtroServicio);
        
        return esDelUsuario && cumpleEstado && cumpleServicio;
    });

    if (pedidosFiltrados.length === 0) { 
        tbody.innerHTML = "<tr><td colspan='9' style='text-align:center;'>No hay pedidos que mostrar.</td></tr>"; 
        return; 
    }

    pedidosFiltrados.forEach(pedido => {
        const tr = document.createElement("tr");
        const estadoActual = pedido["Estado"] ? pedido["Estado"] : "Pendiente";
        const instrucciones = pedido["Instrucciones"] || "";
        const claseEstado = getClassPorEstado(estadoActual);
        
        const enlacesArchivos = pedido["Archivo(s)"] ? pedido["Archivo(s)"].split(",") : [];
        let htmlArchivos = enlacesArchivos.map((link, i) => `<a href="${link.trim()}" target="_blank" style="color:#4F46E5; display:block; margin-bottom:4px;">Ver Archivo ${i+1}</a>`).join("");

        let fechaLimpia = pedido["Marca temporal"] ? new Date(pedido["Marca temporal"]).toLocaleString() : 'N/A';

        let rowHTML = `
            <td>${fechaLimpia}</td>
            <td><strong>${pedido["¿Qué servicio necesitas?"] || 'N/A'}</strong></td>
            <td>${pedido["Nombre completo"] || 'N/A'}</td>
            <td>${pedido["Grado y Grupo"] || 'N/A'}</td>
            <td>${pedido["Descripcion del producto"] || 'N/A'}</td>
            <td>${htmlArchivos}</td>
            <td><span class="status-badge ${claseEstado}">${estadoActual}</span></td>
            <td>${instrucciones}</td>
        `;

        if (esAdmin) {
            const instLimpia = instrucciones.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, "\\n").replace(/\r/g, "");
            rowHTML += `<td><button class="btn-small" onclick="abrirModal(${pedido.fila_excel}, '${estadoActual}', '${instLimpia}', '${pedido["Dirección de correo electrónico"]}', '${pedido["Nombre completo"]}')">Editar</button></td>`;
        }
        tr.innerHTML = rowHTML; tbody.appendChild(tr);
    });
}
document.getElementById("filter-estado").addEventListener("change", renderizarTabla);
document.getElementById("filter-servicio").addEventListener("change", renderizarTabla);

window.abrirModal = function(fila, estado, instrucciones, correo, nombre) {
    document.getElementById("edit-fila").value = fila; 
    document.getElementById("edit-estado").value = estado;
    document.getElementById("edit-instrucciones").value = instrucciones; 
    document.getElementById("edit-correo").value = correo;
    document.getElementById("edit-nombre").value = nombre; 
    document.getElementById("modal-editar").classList.remove("hidden");
};

document.getElementById("btn-cerrar-modal").addEventListener("click", () => document.getElementById("modal-editar").classList.add("hidden"));

async function recargarDatosSilencioso() {
    try {
        const respuesta = await fetch(API_URL);
        todosLosPedidos = await respuesta.json();
        renderizarTabla();
    } catch(e) {}
}

document.getElementById("btn-guardar-cambios").addEventListener("click", async () => {
    const fila = document.getElementById("edit-fila").value; 
    const nuevoEstado = document.getElementById("edit-estado").value;
    const nuevasInst = document.getElementById("edit-instrucciones").value; 
    const correoAlumno = document.getElementById("edit-correo").value;
    const nombreAlumno = document.getElementById("edit-nombre").value; 
    const btn = document.getElementById("btn-guardar-cambios");

    btn.innerText = "Guardando..."; btn.disabled = true;

    Swal.fire({ title: 'Procesando', html: 'Actualizando base de datos y enviando correo...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

    try {
        await fetch(API_URL, { method: "POST", body: JSON.stringify({ fila_excel: fila, estado: nuevoEstado, instrucciones: nuevasInst }), headers: { "Content-Type": "text/plain;charset=utf-8" } });
        const templateParams = { to_email: correoAlumno, name: nombreAlumno, estado: nuevoEstado, instrucciones: nuevasInst || "Sin instrucciones por el momento." };
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
        
        document.getElementById("modal-editar").classList.add("hidden"); 
        await recargarDatosSilencioso(); 
        
        Swal.fire({ icon: 'success', title: '¡Actualizado!', text: 'El pedido se actualizó y el alumno ha sido notificado.', timer: 2000, showConfirmButton: false });

    } catch (error) { 
        Swal.fire({ icon: 'error', title: 'Oops...', text: 'Ocurrió un error al intentar guardar los cambios.' });
    } finally { 
        btn.innerText = "Guardar"; btn.disabled = false; 
    }
});