const API_URL = '/api/vehicles';

export async function getVehicle(id) {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok)
        throw new Error('Ошибка загрузки');
    return await response.json();
}

export async function saveVehicle(data, isEdit) {
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `${API_URL}/${data.id}` : API_URL;

    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok)
        throw new Error('Ошибка сохранения');
    return await response.json();
}

export async function getVehicles() {
    const response = await fetch(`${API_URL}`);
    if (!response.ok)
        throw new Error('Ошибка загрузки');
    return await response.json();
}