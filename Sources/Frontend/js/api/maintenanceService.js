const API_URL = 'http://localhost:5291/api/maintenance';

export async function getVehicleMaintenances(vehicleId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/${vehicleId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html'; 
        return; 
    }
    if (!response.ok)
        throw new Error('Ошибка загрузки');
    return await response.json();
}


export async function getMaintenanceTypes() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/types`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html'; 
        return; 
    }
    if (!response.ok)
        throw new Error('Ошибка загрузки');
    return await response.json();
}