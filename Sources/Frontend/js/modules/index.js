import { getVehicleMaintenances } from "../api/maintenanceService.js";
import { getVehicles } from "../api/vehicleService.js";

export function index() {
    return {
        cars: [],
        maintenanceItems: [],
        currentCarIndex: 0,

        init() {
            this.initVehicles()
            this.initMaintenances()
        },

        async initMaintenances() {
            try {
                this.maintenanceItems = await getVehicleMaintenances(this.cars[this.currentCarIndex]);
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

        // Методы
        getIconClass(type) {
            const icons = {
                'oil_change': 'fas fa-oil-can',
                'filter_change': 'fas fa-filter',
                'inspection': 'fas fa-search',
                'belt_change': 'fas fa-cog',
                'default': 'fas fa-tools'
            };
            return icons[type] || icons.default;
        },

        getProgress(item) {
            if (item.due_type === 'mileage') {
                const passed = this.currentCar.mileage - item.last_changed;
                return Math.min(100, Math.max(0, (passed / item.interval) * 100));
            } else {
                const lastChangedDate = new Date(item.last_changed);
                const today = new Date();
                const daysPassed = Math.floor((today - lastChangedDate) / (1000 * 60 * 60 * 24));
                return Math.min(100, Math.max(0, (daysPassed / item.interval) * 100));
            }
        },

        getRemainingValue(item) {
            if (item.due_type === 'mileage') {
                return item.due_value - this.currentCar.mileage;
            } else {
                return item.due_value;
            }
        },

        isOverdue(item) {
            if (item.due_type === 'mileage') {
                return this.currentCar.mileage >= item.due_value;
            } else {
                return item.due_value <= 0;
            }
        },

        isDueSoon(item) {
            const remaining = this.getRemainingValue(item);
            if (item.due_type === 'mileage') {
                return remaining <= 3000; // 1000 км до ТО
            } else {
                return remaining <= 7; // 7 дней до ТО
            }
        },

        getDueText(item) {
            if (item.due_type === 'mileage') {
                const remaining = item.due_value - this.currentCar.mileage;
                return remaining > 0 ? `Осталось ${remaining} км` : `Просрочено на ${-remaining} км`;
            } else {
                return item.due_value > 0 ? `Осталось ${item.due_value} дней` : `Просрочено на ${-item.due_value} дней`;
            }
        },

        getShortDueText(item) {
            if (item.due_type === 'mileage') {
                const remaining = item.due_value - this.currentCar.mileage;
                return remaining > 0 ? `${remaining} км` : `+${-remaining} км`;
            } else {
                return item.due_value > 0 ? `${item.due_value} дн.` : `+${-item.due_value} дн.`;
            }
        },

        getIntervalText(item) {
            return item.due_type === 'mileage'
                ? `Каждые ${item.interval} км`
                : `Каждые ${item.interval} дней`;
        },

        getLastChangedText(item) {
            if (item.due_type === 'mileage') {
                return `Последняя замена: ${item.last_changed} км`;
            } else {
                const date = new Date(item.last_changed);
                return `Последняя замена: ${date.toLocaleDateString()}`;
            }
        },

        getShortLastChangedText(item) {
            if (item.due_type === 'mileage') {
                return `@${item.last_changed} км`;
            } else {
                const date = new Date(item.last_changed);
                return `@${date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}`;
            }
        },

        updateMileage() {
            const newMileage = prompt('Введите текущий пробег:', this.currentCar.mileage);
            if (newMileage && !isNaN(newMileage)) {
                this.currentCar.mileage = parseInt(newMileage);
            }
        },
    }
}