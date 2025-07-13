import { SERVER_URL } from "./config.js";
import { createJsonHeaders, getToken } from './auth.js';

const API_URL = `${SERVER_URL}/api/vehicles`;

export async function getVehicle(id) {
    const response = await fetch(`${API_URL}/${id}`, {
        method: 'GET',
        headers: createJsonHeaders()
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}

export async function saveVehicle(data, isEdit) {
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `${API_URL}/${data.id}` : API_URL;
    const response = await fetch(url, {
        method,
        headers: createJsonHeaders(),
        body: JSON.stringify(data)
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}

export async function getVehicles() {
    const response = await fetch(`${API_URL}`, {
        method: 'GET',
        headers: createJsonHeaders()
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return await response.json();
}


export async function deleteVehicle(id) {
    const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: createJsonHeaders()
    });

    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return;
}

export async function uploadImage(id, file) {
    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`${API_URL}/upload/${id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });

        if (!response.ok) {
            alert("Ошибка загрузки изображения");
        }
    } catch (error) {
        console.error("Ошибка при загрузке", error);
    }
}