const API_URL = 'http://localhost:5291/api/maintenances';

export async function getVehicleMaintenances(vehicleId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/${vehicleId}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
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