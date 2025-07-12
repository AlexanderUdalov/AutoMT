const API_URL = '/api/vehicles';

export async function getVehicle(id) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/${id}`, {
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

export async function saveVehicle(data, isEdit) {
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `${API_URL}/${data.id}` : API_URL;

    const token = localStorage.getItem('token');

    const response = await fetch(url, {
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
        throw new Error('Ошибка сохранения');
    return await response.json();
}

export async function getVehicles() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}`, {
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


export async function deleteVehicle(id) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
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
    
    return;
}