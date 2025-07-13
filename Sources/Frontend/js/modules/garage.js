import { getVehicles, deleteVehicle, saveVehicle, uploadImage } from '../api/vehicleService.js';

export function garage() {
    return {
        cars: [],
        openModal: false,
        carToDelete: {},
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

        openDeleteModal(car) {
            this.carToDelete = car;
            this.openModal = true;
        },

        async deleteCar() {
            await deleteVehicle(this.carToDelete.id);
            this.carToDelete = {};
            this.openModal = false;
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