import { getVehicle, saveVehicle } from '../api/vehicleService.js';

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
                this.maintenanceItems = this.getDefaultMaintenanceItems();
            }
        },

        getDefaultMaintenanceItems() {
            return [
                { type: 'Замена масла двигателя', interval: 10000, lastCompletedMileage: 0, icon: 'fas fa-oil-can' },
                { type: 'Замена масла в коробке передач', interval: 60000, lastCompletedMileage: 0, icon: 'fas fa-cog' },
                { type: 'Замена воздушного фильтра', interval: 15000, lastCompletedMileage: 0, icon: 'fas fa-wind' },
                { type: 'Замена салонного фильтра', interval: 20000, lastCompletedMileage: 0, icon: 'fas fa-car' },
                { type: 'Замена топливного фильтра', interval: 30000, lastCompletedMileage: 0, icon: 'fas fa-gas-pump' },
                { type: 'Замена свечей зажигания', interval: 30000, lastCompletedMileage: 0, icon: 'fas fa-bolt' },
                { type: 'Замена тормозной жидкости', interval: 40000, lastCompletedMileage: 0, icon: 'fas fa-tint' },
                { type: 'Замена ремня ГРМ', interval: 90000, lastCompletedMileage: 0, icon: 'fas fa-cogs' },
                { type: 'Замена охлаждающей жидкости', interval: 50000, lastCompletedMileage: 0, icon: 'fas fa-temperature-low' },
                { type: 'Диагностика подвески', interval: 15000, lastCompletedMileage: 0, icon: 'fas fa-car-side' }
            ];
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

        async submitForm() {
            try {
                await saveVehicle(this.car, this.isEditMode);
                window.location.href = 'garage.html';
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка при сохранении');
            }
        }
    };
}