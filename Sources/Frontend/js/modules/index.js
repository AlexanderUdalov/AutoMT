import { getVehicleMaintenances, getMaintenanceTypes, saveMaintenance } from "../api/maintenanceService.js";
import { getVehicles, saveVehicle } from "../api/vehicleService.js";

export function index() {
    return {
        cars: [],
        maintenanceTypes: [],
        maintenanceItems: [],
        updateMileageModalOpened: false,
        mileageNotification: false,
        disableNotify: false,
        newMileage: 0,
        currentCarIndex: 0,
        inited: false,

        async init() {
            await this.initVehicles();
            const urlParams = new URLSearchParams(window.location.search);
            var currentVehicleId = urlParams.get('vehicleId');
            if (currentVehicleId) {
                this.currentCarIndex = this.cars.findIndex(item => item.id == currentVehicleId);
            }
            else {
                this.currentCarIndex = 0;
            }
            await this.initMaintenances();
            this.inited = true;

            if (this.cars[this.currentCarIndex].disableNotify === false) {
                const lastUpdate = new Date(this.cars[this.currentCarIndex].lastMileageUpdate);
                const now = new Date();

                const daysPassed = (now - lastUpdate) / (1000 * 60 * 60 * 24);

                if (daysPassed >= 7) {
                    this.mileageNotification = true;
                    this.openUpdateMileageModal();
                }
            }
        },

        async initMaintenances() {
            try {
                this.maintenanceTypes = await getMaintenanceTypes();
                this.maintenanceItems = await getVehicleMaintenances(this.cars[this.currentCarIndex].id);
            } catch (error) {
                console.error('Ошибка загрузки:', error);
            }
        },

        async initVehicles() {
            try {
                this.cars = await getVehicles();
            } catch (error) {
                console.error('Ошибка загрузки:', error);
            }
        },

        openUpdateMileageModal() {
            this.newMileage = this.currentCar.mileage;
            this.updateMileageModalOpened = true;
        },

        async updateMileage() {
            try {
                const res = await saveVehicle({
                    id: this.currentCar.id,
                    mileage: this.newMileage,
                    disableNotify: this.disableNotify
                }, true);
                if (res) {
                    await this.init();
                }
            } catch (error) {
                console.error('Ошибка:', error);
            }

            this.newMileage = 0;
            this.updateMileageModalOpened = false;
            await this.init();
        },

        selectCar(Index) {
            this.currentCarIndex = Index
        },

        get currentCar() {
            return this.cars[this.currentCarIndex] || { mileage: 0 };
        },

        copied: false,
        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                this.copied = true;
                setTimeout(() => this.copied = false, 1500);
            });
        },

        expandedItems: [],

        // Переключение раскрытия карточки
        toggleExpand(id) {
            if (this.expandedItems.includes(id)) {
                this.expandedItems = this.expandedItems.filter(itemId => itemId !== id);
            } else {
                this.expandedItems.push(id);
            }
        },

        // Отсортированные работы
        sortedMaintenanceItems() {
            return [...this.maintenanceItems].sort((a, b) => {
                // Просроченные в начале
                if (this.isOverdue(a) && !this.isOverdue(b)) return -1;
                if (!this.isOverdue(a) && this.isOverdue(b)) return 1;

                // Затем близкие к выполнению
                if (this.isDueSoon(a) && !this.isDueSoon(b)) return -1;
                if (!this.isDueSoon(a) && this.isDueSoon(b)) return 1;

                // Затем по оставшемуся ресурсу
                const aRemaining = this.getRemainingValue(a);
                const bRemaining = this.getRemainingValue(b);
                return aRemaining - bRemaining;
            });
        },

        getMaintenanceType(index) {
            return this.maintenanceTypes.find(item => item.id == index);
        },

        getNextMileage(item) {
            var type = this.getMaintenanceType(item.typeId);
            return item.mileage + type.period;
        },

        getProgress(item) {
            const passed = this.currentCar.mileage - item.mileage;
            var type = this.getMaintenanceType(item.typeId);
            return Math.min(100, Math.max(0, (passed / type.period) * 100));
        },

        getRemainingValue(item) {
            return this.getNextMileage(item) - this.currentCar.mileage;
        },

        isOverdue(item) {
            return this.currentCar.mileage >= this.getNextMileage(item);

        },

        isDueSoon(item) {
            const remaining = this.getRemainingValue(item);
            return remaining <= 3000;
        },

        getDueText(item) {
            const remaining = this.getNextMileage(item) - this.currentCar.mileage;
            return remaining > 0 ? `Осталось ${remaining} км` : `Просрочено на ${-remaining} км`;
        },

        async skipMaintenance(typeId) {
            const payload = {
                mileage: this.currentCar.mileage,
                typeId: typeId,
                isSkipped: true
            };
            await saveMaintenance(payload, this.currentCar.id);
            await this.init();
        }
    }
}