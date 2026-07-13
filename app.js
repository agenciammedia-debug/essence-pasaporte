const API_URL = 'https://script.google.com/macros/s/AKfycbyAlLxHtkUh0GrcRsZkX7D4VO9x48uo7YJmqnP3UcQ5vzpP73ZKgPY6Vv1Fnf_H-J5e/exec';

document.addEventListener('DOMContentLoaded', async () => {
    // Registro del Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW error:', err));
    }

    const storedId = localStorage.getItem('essence_client_id');
    
    // Si ya existe sesión
    if (storedId) {
        await cargarPasaporte(storedId, window.tokenEscaneado);
    } else {
        // Mostrar pantalla de ingreso/registro
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('register-view').classList.remove('hidden');
    }

    // Solicitar Push si están bloqueados
    verificarBotonPush();
});

// Función de Conexión Universal API
async function apiCall(action, payload) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: action, ...payload })
        });
        return await response.json();
    } catch (error) {
        console.error("Error API:", error);
        return null;
    }
}

// Control del Formulario (Ingreso / Registro)
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const telefono = document.getElementById('reg-telefono').value.trim();
    const extraFields = document.getElementById('extra-fields');

    document.getElementById('loader').classList.remove('hidden');
    const oneSignalId = await getOneSignalId();

    // 1. Verificamos si el número existe
    const data = await apiCall('checkClient', { telefono: telefono });

    if (data && data.existe) {
        // Ya es socia, ingresar
        localStorage.setItem('essence_client_id', data.client.id);
        await cargarPasaporte(data.client.id, window.tokenEscaneado);
    } else {
        // Es nueva. Si los campos extras están ocultos, los mostramos para que complete
        if (extraFields.classList.contains('hidden')) {
            document.getElementById('loader').classList.add('hidden');
            extraFields.classList.remove('hidden');
            document.getElementById('btn-register').innerText = "Crear Pasaporte";
            document.getElementById('reg-nombre').required = true;
            document.getElementById('reg-mes').required = true;
        } else {
            // Registrar a la nueva socia
            const nombre = document.getElementById('reg-nombre').value;
            const instagram = document.getElementById('reg-ig').value;
            const cumple = document.getElementById('reg-mes').value;
            const correo = document.getElementById('reg-correo').value;

            const regReq = await apiCall('registerClient', { 
                clientData: { nombre, telefono, instagram, cumple, correo }, 
                token: window.tokenEscaneado, 
                oneSignalId: oneSignalId 
            });

            if (regReq && regReq.success) {
                localStorage.setItem('essence_client_id', regReq.id);
                await cargarPasaporte(regReq.id, null);
            }
        }
    }
});

// Cargar Datos en la Vista de Tarjeta Premium
async function cargarPasaporte(clientId, tokenUrl) {
    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('register-view').classList.add('hidden');
    
    const oneSignalId = await getOneSignalId();

    // Sumar token si proviene de QR
    if (tokenUrl) {
        const addReq = await apiCall('addSticker', { clientId: clientId, token: tokenUrl, oneSignalId: oneSignalId });
        if (addReq && addReq.status === 'OK') {
            clientId = addReq.nuevoId || clientId;
            localStorage.setItem('essence_client_id', clientId);
            mostrarToast();
            window.history.replaceState({}, document.title, window.location.pathname);
            
            if(addReq.isMilestone === 5) mostrarCelebracion("¡Mitad de Pasaporte!", "Tienes 50% OFF en tu próximo servicio.");
            if(addReq.isMilestone === 10) mostrarCelebracion("¡Pasaporte Lleno!", "¡Tienes un Servicio Gratis esperando por ti!");
        }
    }

    // Obtener datos finales para pintar UI
    const userData = await apiCall('getClientData', { clientId: clientId, oneSignalId: oneSignalId });
    
    if (userData) {
        document.getElementById('client-name').innerText = userData.nombre.split(" ")[0];
        document.getElementById('client-points').innerText = userData.puntos;
        pintarStickersUI(userData.puntos);
        
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('dashboard-view').classList.remove('hidden');
    } else {
        localStorage.removeItem('essence_client_id');
        location.reload();
    }
}

// Pintar stickers conservando tus estilos y colores exactos
function pintarStickersUI(puntos) {
    const grid = document.getElementById('stickers-grid');
    grid.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) {
        const div = document.createElement('div');
        div.className = "aspect-square rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all duration-500 relative bg-white border-[#d9bbb1]/30 text-[#d9bbb1]/40";
        
        if (i <= puntos) {
            // Sello Activo
            div.className = "aspect-square rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all duration-500 relative bg-[#D9889A] border-[#D9889A] text-white shadow-md transform scale-105";
            div.innerHTML = '💕'; 
        } else {
            // Vacío
            div.innerText = i;
        }

        // Estilos especiales para el 5 y 10 (las metas)
        if (i === 5 || i === 10) {
            if (i > puntos) {
                div.classList.add('border-[#D9889A]', 'text-[#D9889A]', 'bg-[#FFF5F7]');
                div.innerHTML = '🎁';
                if (i === puntos + 1) div.classList.add('animate-latido'); // Próxima meta late
            }
        }
        
        grid.appendChild(div);
    }
}

// Animaciones de tu diseño (Toasts y Modal)
function mostrarToast() {
    const toast = document.getElementById('toast-nuevo-sticker');
    toast.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
    }, 4000);
}

function mostrarCelebracion(titulo, desc) {
    const modal = document.getElementById('celebration-modal');
    const card = document.getElementById('celebration-card');
    document.getElementById('celebration-title').innerText = titulo;
    document.getElementById('celebration-desc').innerText = desc;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-90');
    }, 50);
}

// Funciones Notificaciones Push (OneSignal)
async function getOneSignalId() {
    return new Promise((resolve) => {
        if(!window.OneSignalDeferred) return resolve(null);
        window.OneSignalDeferred.push(async function(OneSignal) {
            const isPushSupported = OneSignal.Notifications.isPushSupported();
            if (!isPushSupported) return resolve(null);
            const userId = await OneSignal.User.PushSubscription.id;
            resolve(userId);
        });
        setTimeout(() => resolve(null), 1500);
    });
}

function verificarBotonPush() {
    if(!window.OneSignalDeferred) return;
    window.OneSignalDeferred.push(async function(OneSignal) {
        const hasPermission = await OneSignal.Notifications.permission;
        const btn = document.getElementById('btn-activar-push');
        if (hasPermission !== "granted") {
            btn.classList.remove('hidden');
            btn.addEventListener('click', () => {
                OneSignal.Notifications.requestPermission();
                btn.classList.add('hidden');
            });
        }
    });
}
