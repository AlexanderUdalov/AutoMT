import { getVehicle } from '../api/vehicleService.js';
import { getMaintenanceTypes, saveMaintenance } from '../api/maintenanceService.js';

export function maintenanceForm() {
    return {
        currentVehicle: {},
        currentMaintenance: {},
        parts: [],

        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            var maintenanceId = urlParams.get('maintenanceId');
            var vehicleId = urlParams.get('vehicleId');

            if (vehicleId) {
                this.currentVehicle = await getVehicle(vehicleId);
            }

            if (maintenanceId) {
                var types = await getMaintenanceTypes();
                this.currentMaintenance = types.find(item => item.id == maintenanceId);
            }
        },

        getVehicleName() {
            return `${this.currentVehicle.brand} ${this.currentVehicle.model}`;
        },

        getMaintenanceName() {
            return `${this.currentMaintenance.name}`;
        },

        addPart() {
            this.parts.push({
                type: '',
                brand: '',
                code: ''
            });
        },

        removePart(index) {
            this.parts.splice(index, 1);
        },

        async submitForm() {
            try {
                const payload = {
                    mileage: this.currentVehicle.mileage,
                    typeId: this.currentMaintenance.id,
                    parts: this.parts
                };

                await saveMaintenance(payload, this.currentVehicle.id);
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка при сохранении');
            }
        }
    }
}