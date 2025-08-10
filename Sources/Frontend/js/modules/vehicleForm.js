import { getVehicle, saveVehicle } from '../api/vehicleService.js';
import { getDefaultMaintenanceTypes } from '../api/maintenanceService.js';

export function vehicleForm() {
    return {
        isEditMode: false,
        vehicleId: null,
        showMaintenanceList: false,
        car: {
            brand: '',
            model: '',
            vin: '',
            year: new Date().getFullYear(),
            currentMileage: 0
        },
        maintenanceItems: [],

        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            this.vehicleId = urlParams.get('id');

            if (this.vehicleId) {
                this.isEditMode = true;
                await this.loadVehicleData(this.vehicleId);
            } else {
                this.maintenanceItems = await getDefaultMaintenanceTypes();
            }
        },

        async loadVehicleData(id) {
            try {
                const vehicle = await getVehicle(id);
                this.car = vehicle;
            } catch (error) {
                console.error('Ошибка загрузки:', error);
                alert('Не удалось загрузить данные');
            }
        },

        removeMaintenanceItem(index) {
            this.maintenanceItems.splice(index, 1)
        },

        async submitForm() {
            try {
                const payload = {
                    ...this.car,
                    maintenanceHistory: this.maintenanceItems
                        .map(item => ({
                            typeId: item.id,
                            mileage: Number(item.mileage ?? 0)
                        }))
                };

                await saveVehicle(payload, this.isEditMode);
                window.location.href = 'garage.html';
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка при сохранении');
            }
        }
    };
}