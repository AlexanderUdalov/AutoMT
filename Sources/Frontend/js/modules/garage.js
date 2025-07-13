import { getVehicles, deleteVehicle, saveVehicle } from '../api/vehicleService.js';

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

        async setAsDefault(index) {
            try {
                const res = await saveVehicle({ id: index, isDefault: true }, true);
                if (res) {
                    await this.init();
                }
            } catch (error) {
                console.error('Ошибка:', error);
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