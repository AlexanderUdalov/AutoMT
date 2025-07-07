import { getVehicles } from './api/vehicleService.js';

export function garage() {
    return {
        cars: [],

        async init() {
            try {
                this.cars = await getVehicles();
            } catch (error) {
                console.error('Ошибка загрузки:', error);
            }
        },

        deleteCar(index) {
            if (confirm('Вы уверены, что хотите удалить эту машину?')) {
                this.cars.splice(index, 1);
            }
        },

        copyToClipboard(text) {
            navigator.clipboard.writeText(text);
            alert('VIN скопирован в буфер обмена');
        }
    };
}