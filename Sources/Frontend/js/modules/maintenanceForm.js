import { getVehicle } from '../api/vehicleService.js';
import { getMaintenanceTypes, saveMaintenance } from '../api/maintenanceService.js';

export function maintenanceForm() {
    return {
        currentVehicle: {},
        currentMaintenance: {},
        parts: [],
        allPartTypes: [], // Все возможные типы запчастей
        availablePartTypes: [], // Доступные для выбора типы
        inited: false,

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
                this.allPartTypes = this.currentMaintenance.parts;
                this.availablePartTypes = [...this.allPartTypes];
            }
            this.inited = true;
        },

        getVehicleName() {
            return `${this.currentVehicle.brand} ${this.currentVehicle.model}`;
        },

        getMaintenanceName() {
            return `${this.currentMaintenance.name}`;
        },

        addPart() {
            if (this.availablePartTypes.length === 0) return;
            
            this.parts.push({
                name: '',
                brand: '',
                article: ''
            });
            
            this.updateAvailablePartTypes();
        },
        
        removePart(index) {
            this.parts.splice(index, 1);
            this.updateAvailablePartTypes();
        },
        updateAvailablePartTypes() {
            const selectedTypes = this.parts.map(p => p.type).filter(Boolean);
            
            this.availablePartTypes = this.allPartTypes.filter(
                pt => !selectedTypes.includes(pt.name)
            );
        },
        
        getAvailablePartTypesForSelect(currentIndex) {
            const currentType = this.parts[currentIndex]?.type;
            if (!currentType) return this.availablePartTypes;
            
            return [
                ...this.allPartTypes.filter(pt => pt.name === currentType),
                ...this.availablePartTypes
            ];
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