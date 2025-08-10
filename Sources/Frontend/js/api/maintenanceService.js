import { SERVER_URL } from "./config.js";
import { createJsonHeaders } from './auth.js';

const API_URL = `${SERVER_URL}/api/maintenance`;

export async function getVehicleMaintenances(vehicleId, fullHistory) {
    const url = new URL(`${API_URL}/${vehicleId}`);
    if (fullHistory) {
        url.searchParams.set('fullHistory', 'true');
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: createJsonHeaders()
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}


export async function saveMaintenance(data, vehicleId) {
    const response = await fetch(`${API_URL}/${vehicleId}`, {
        method: 'POST',
        headers: createJsonHeaders(),
        body: JSON.stringify(data)
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}


export async function getDefaultMaintenanceTypes() {
    const response = await fetch(`${API_URL}/types`, {
        method: 'GET',
        headers: createJsonHeaders()
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}

export async function getVehicleMaintenanceTypes(vehicleId) {
    const response = await fetch(`${API_URL}/${vehicleId}/types`, {
        method: 'GET',
        headers: createJsonHeaders()
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}


export async function deleteMaintenanceType(vehicleId, typeId) {
    const response = await fetch(`${API_URL}/${vehicleId}/types/${typeId}`, {
        method: 'DELETE',
        headers: createJsonHeaders()
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return;
}


export async function addMaintenanceType(vehicleId, data) {
    const response = await fetch(`${API_URL}/${vehicleId}/types`, {
        method: 'POST',
        headers: createJsonHeaders(),
        body: JSON.stringify(data)
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}