const API_URL = '/api/maintenances';

export async function getVehicleMaintenances(vehicleId) {
    const response = await fetch(`${API_URL}/${vehicleId}`);
    if (!response.ok)
        throw new Error('Ошибка загрузки');
    return await response.json();
}