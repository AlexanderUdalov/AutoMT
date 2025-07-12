import { getVehicles } from '../api/vehicleService.js';
import { deleteVehicle } from '../api/vehicleService.js';

export function garage() {
    return {
        cars: [],
        inited: false,

        async init() {
            try {
                this.cars = await getVehicles();
                this.inited = true;
            } catch (error) {
                console.error('Ошибка загрузки:', error);
            }
        },

        deleteCar(index) {
            if (confirm('Вы уверены, что хотите удалить эту машину?')) {
                deleteVehicle(index);
                this.init();
            }
        },

        copied: false,
        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                this.copied = true;
                setTimeout(() => this.copied = false, 1500);
            });
        }
    };
}