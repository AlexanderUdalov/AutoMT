
export function maintenance() {
    return {
        currentCar: {
            brand: 'Toyota',
            model: 'Camry',
            year: 2018,
            vin: 'JT2BF22K1W0123456',
            mileage: 75000
        },

        maintenanceItems: [
            {
                id: 1,
                name: 'Замена моторного масла',
                type: 'oil_change',
                due_type: 'mileage',
                due_value: 80000,
                interval: 10000,
                last_changed: 70000,
                parts: [
                    { id: 1, name: 'Масло моторное 5W-30', code: 'MOBIL-5W30-SYN', quantity: 5 },
                    { id: 2, name: 'Масляный фильтр', code: 'TOYOTA-15678', quantity: 1 }
                ]
            },
            {
                id: 2,
                name: 'Замена воздушного фильтра',
                type: 'filter_change',
                due_type: 'mileage',
                due_value: 90000,
                interval: 15000,
                last_changed: 75000,
                parts: [
                    { id: 3, name: 'Воздушный фильтр', code: 'MANN-C25138', quantity: 1 }
                ]
            },
            {
                id: 3,
                name: 'Замена салонного фильтра',
                type: 'filter_change',
                due_type: 'days',
                due_value: 15,
                interval: 365,
                last_changed: '2023-11-01',
                parts: [
                    { id: 4, name: 'Салонный фильтр угольный', code: 'FRAM-CF10934', quantity: 1 }
                ]
            },
            {
                id: 4,
                name: 'Проверка тормозной системы',
                type: 'inspection',
                due_type: 'mileage',
                due_value: 77000,
                interval: 5000,
                last_changed: 72000,
                parts: []
            },
            {
                id: 5,
                name: 'Замена ремня ГРМ',
                type: 'belt_change',
                due_type: 'mileage',
                due_value: 120000,
                interval: 60000,
                last_changed: 60000,
                parts: [
                    { id: 5, name: 'Ремень ГРМ', code: 'GATES-TB275', quantity: 1 },
                    { id: 6, name: 'Ролик натяжителя', code: 'GATES-T40070', quantity: 1 }
                ]
            }
        ],
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
        get sortedMaintenanceItems() {
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

        // Остальные методы (copyToClipboard, updateMileage, markAsDone, addMaintenanceItem, editMaintenanceList)
        // остаются такими же как в предыдущем примере
        copyToClipboard(text) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    alert('VIN скопирован в буфер обмена');
                })
                .catch(err => {
                    console.error('Ошибка копирования: ', err);
                });
        },

        updateMileage() {
            const newMileage = prompt('Введите текущий пробег:', this.currentCar.mileage);
            if (newMileage && !isNaN(newMileage)) {
                this.currentCar.mileage = parseInt(newMileage);
            }
        },

        markAsDone(id) {
            const item = this.maintenanceItems.find(i => i.id === id);
            if (confirm(`Отметить "${item.name}" как выполненное?`)) {
                if (item.due_type === 'mileage') {
                    item.last_changed = this.currentCar.mileage;
                    item.due_value = this.currentCar.mileage + item.interval;
                } else {
                    item.last_changed = new Date().toISOString().split('T')[0];
                    item.due_value = item.interval;
                }
            }
        },

        addMaintenanceItem() {
            const name = prompt('Введите название работы:');
            if (name) {
                const newItem = {
                    id: Date.now(),
                    name: name,
                    type: 'other',
                    due_type: 'mileage',
                    due_value: this.currentCar.mileage + 10000,
                    interval: 10000,
                    last_changed: this.currentCar.mileage,
                    parts: []
                };
                this.maintenanceItems.push(newItem);
            }
        },

        editMaintenanceList() {
            alert('Здесь будет открытие модального окна для редактирования всего списка работ');
        },

        init() {
            // Пересчет due_value для работ по дням
            this.maintenanceItems.forEach(item => {
                if (item.due_type === 'days' && item.last_changed) {
                    const lastChangedDate = new Date(item.last_changed);
                    const today = new Date();
                    const daysPassed = Math.floor((today - lastChangedDate) / (1000 * 60 * 60 * 24));
                    item.due_value = item.interval - daysPassed;
                }
            });
        }
    }
}