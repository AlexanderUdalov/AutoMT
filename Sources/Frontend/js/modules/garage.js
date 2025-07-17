import { getVehicles, deleteVehicle, saveVehicle, uploadImage } from '../api/vehicleService.js';

export function garage() {
    return {
        cars: [],
        deleteCarModalOpened: false,
        updateMileageModalOpened: false,
        newMileage: 0,
        modalCar: {},
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

        openUpdateMileageModal(car) {
            this.modalCar = car;
            this.newMileage = car.mileage;
            this.updateMileageModalOpened = true;
        },

        async updateMileage()
        {
            try {
                const res = await saveVehicle({ id: this.modalCar.id, mileage: this.newMileage }, true);
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

        openDeleteModal(car) {
            this.modalCar = car;
            this.deleteCarModalOpened = true;
        },

        async deleteCar() {
            await deleteVehicle(this.modalCar.id);
            this.modalCar = {};
            this.deleteCarModalOpened = false;
            await this.init();

        },

        copied: false,
        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                this.copied = true;
                setTimeout(() => this.copied = false, 1500);
            });
        },


        currentUploadCarId: null,
        startImageUpload(carId) {
            this.currentUploadCarId = carId;
            this.$refs.fileInput.click();
        },

        async handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file || !this.currentUploadCarId) return;
            await uploadImage(this.currentUploadCarId, file);
        },
    };
}