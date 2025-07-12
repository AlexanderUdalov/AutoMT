import { SERVER_URL } from "./config.js";
import { createJsonHeaders } from './auth.js';

const API_URL = `${SERVER_URL}/api/maintenance`;

export async function getVehicleMaintenances(vehicleId) {
    const response = await fetch(`${API_URL}/${vehicleId}`, {
        method: 'GET',
        headers: createJsonHeaders()
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}


export async function saveMaintenance(data, vehicleId) {
    const response = await fetch(`${API_URL}/${vehicleId}` , {
        method: 'POST',
        headers: createJsonHeaders(),
        body: JSON.stringify(data)
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}


export async function getMaintenanceTypes() {
    const response = await fetch(`${API_URL}/types`, {
        method: 'GET',
        headers: createJsonHeaders()
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}