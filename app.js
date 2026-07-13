// URL DE TU NUEVO BACKEND EN APPS SCRIPT
const API_URL = 'https://script.google.com/macros/s/AKfycbyq78buU3wKy7kX5FELLdHCMn8x4VjZDp0elKRVyNRcvpd1l30qQbkuYme_qP8NkllB/exec';

// Referencias al DOM
const loader = document.getElementById('loader');
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');

// Inicialización de la App
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Registrar Service Worker para PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/essence-pasaporte/sw.js').catch(err => console.log('Error en SW:', err));
    }

    // 2. Revisar si hay un escaneo de QR (Token) en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // 3. Revisar sesión persistente (Soluciona el problema de Safari)
    const storedId = localStorage.getItem('essence_client_id');
    
    if (storedId) {
        await cargarDashboard(storedId, token);
    } else {
        ocultarCarga();
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('flex');
    }
});

// Función central para hacer peticiones POST al backend evitando CORS
async function apiCall(action, payload) {
    try {
        const body = JSON.stringify({ action: action, ...payload });
        const response = await fetch(API_URL, {
            method: 'POST',
            body: body
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error conectando al servidor:", error);
        alert("Hubo un problema de conexión. Intenta de nuevo.");
        return null;
    }
}

// Lógica del Login
document.getElementById('btn-ingresar').addEventListener('click', async () => {
    const telefono = document.getElementById('input-telefono').value.trim();
    if (telefono.length < 9) return alert("Por favor ingresa un teléfono válido.");

    mostrarCarga();
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    // Obtener ID de OneSignal si está suscrito
    const oneSignalId = await getOneSignalId();

    const data = await apiCall('checkClient', { telefono: telefono });
    
    if (data && data.existe) {
        // Loguearse y sumar punto si hay QR
        if (token) {
            const addReq = await apiCall('addSticker', { clientId: data.client.id, token: token, oneSignalId: oneSignalId });
            if (addReq && addReq.status === 'OK') {
                localStorage.setItem('essence_client_id', addReq.nuevoId || data.client.id);
                alert("¡Sticker añadido exitosamente!");
            }
        } else {
            localStorage.setItem('essence_client_id', data.client.id);
        }
        await cargarDashboard(localStorage.getItem('essence_client_id'), null);
    } else {
        // Redirigir a registro (Aquí puedes abrir un modal de registro. Por simplicidad, simularemos un registro rápido)
        const nombre = prompt("¡Nueva socia! ¿Cuál es tu nombre?");
        if (nombre) {
            const regReq = await apiCall('registerClient', { 
                clientData: { nombre, telefono, instagram: '', cumple: '', correo: '' }, 
                token: token, 
                oneSignalId: oneSignalId 
            });
            if (regReq && regReq.success) {
                localStorage.setItem('essence_client_id', regReq.id);
                await cargarDashboard(regReq.id, null);
            }
        } else {
            ocultarCarga();
        }
    }
});

// Cargar información del Dashboard
async function cargarDashboard(clientId, token) {
    mostrarCarga();
    const oneSignalId = await getOneSignalId();
    
    // Si entró con un Token (QR) estando ya logueado previamente
    if (token) {
        const addReq = await apiCall('addSticker', { clientId: clientId, token: token, oneSignalId: oneSignalId });
        if (addReq && addReq.status === 'OK') {
            clientId = addReq.nuevoId || clientId;
            localStorage.setItem('essence_client_id', clientId);
            alert("¡Nuevo sticker escaneado con éxito! 💖");
            // Limpiar la URL para evitar recargas accidentales
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (addReq && addReq.error === 'QR_USADO') {
            alert("Este código QR ya ha sido utilizado o es inválido.");
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    const userData = await apiCall('getClientData', { clientId: clientId, oneSignalId: oneSignalId });
    
    if (userData) {
        document.getElementById('user-name').innerText = userData.nombre.split(" ")[0];
        document.getElementById('user-points').innerText = userData.puntos;
        renderStickers(userData.puntos);
        
        loginScreen.classList.add('hidden');
        loginScreen.classList.remove('flex');
        dashboardScreen.classList.remove('hidden');
        dashboardScreen.classList.add('flex');
        
        // Solicitar permisos Push si no los tiene
        gestionarBotonPush();
    } else {
        // Si el ID ya no existe (borrado de BD)
        localStorage.removeItem('essence_client_id');
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('flex');
    }
    ocultarCarga();
}

// Dibuja los círculos del pasaporte
function renderStickers(puntos) {
    const grid = document.getElementById('stickers-grid');
    grid.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) {
        const div = document.createElement('div');
        div.className = "aspect-square rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all duration-500";
        
        if (i <= puntos) {
            div.classList.add('bg-pink-500', 'border-pink-500', 'text-white', 'shadow-md', 'scale-105');
            div.innerHTML = '<i class="fas fa-heart"></i>'; // Sello activo
        } else {
            div.classList.add('bg-gray-50', 'border-gray-200', 'text-gray-300');
            div.innerText = i;
        }

        // Marcar metas (5 y 10)
        if (i === 5 || i === 10) {
            div.classList.add('ring-4', 'ring-pink-100');
            if (i > puntos) div.innerHTML = '<i class="fas fa-gift"></i>';
        }
        
        grid.appendChild(div);
    }

    const msg = document.getElementById('mensaje-meta');
    if (puntos < 5) msg.innerText = `Faltan ${5 - puntos} stickers para tu 50% OFF 🎉`;
    else if (puntos >= 5 && puntos < 10) msg.innerText = `Faltan ${10 - puntos} stickers para tu Servicio GRATIS 🎁`;
    else msg.innerText = "¡Pasaporte Completo! Reclama tu premio. ✨";
}

// Helpers de Interfaz
function mostrarCarga() { loader.classList.remove('opacity-0', 'pointer-events-none'); }
function ocultarCarga() { loader.classList.add('opacity-0', 'pointer-events-none'); }

document.getElementById('btn-logout').addEventListener('click', () => {
    if(confirm("¿Segura que deseas cerrar sesión?")) {
        localStorage.removeItem('essence_client_id');
        location.reload();
    }
});

// Integración OneSignal Asíncrona
async function getOneSignalId() {
    return new Promise((resolve) => {
        window.OneSignalDeferred.push(async function(OneSignal) {
            const isPushSupported = OneSignal.Notifications.isPushSupported();
            if (!isPushSupported) resolve(null);
            
            const userId = await OneSignal.User.PushSubscription.id;
            resolve(userId);
        });
        setTimeout(() => resolve(null), 1500); // Timeout fallback
    });
}

function gestionarBotonPush() {
    window.OneSignalDeferred.push(async function(OneSignal) {
        const hasPermission = await OneSignal.Notifications.permission;
        const btn = document.getElementById('btn-notificaciones');
        
        if (hasPermission !== "granted") {
            btn.classList.remove('hidden');
            btn.addEventListener('click', () => {
                OneSignal.Notifications.requestPermission();
                btn.classList.add('hidden');
            });
        }
    });
}
