import { getVehicles } from '../api/vehicleService.js';

export function garage() {
    return {
        cars: [],

        async init() {
            try {
                this.cars = await getVehicles();
            } catch (error) {
                console.error('Ошибка загрузки:', error);
                this.cars = [
                    {
                        id: 1,
                        brand: 'Toyota',
                        model: 'Camry',
                        vin: 'JT3AC12R8M1000001',
                        year: 2018,
                        mileage: 45000
                    },
                    {
                        id: 2,
                        brand: 'Honda',
                        model: 'Civic',
                        vin: '2HGFG3B59DH500002',
                        year: 2020,
                        mileage: 23000
                    },
                    {
                        id: 3,
                        brand: 'BMW',
                        model: 'X5',
                        vin: '5UXKR0C5XF0P00003',
                        year: 2017,
                        mileage: 68000
                    }
                ];
            }
        },

        deleteCar(index) {
            if (confirm('Вы уверены, что хотите удалить эту машину?')) {
                this.cars.splice(index, 1);
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