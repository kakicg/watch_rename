class Barcode {
    constructor() {
        this.name = '';
        this.date = new Date(0);
        this.number = '';
        this.lane = '';
        this.size = '';
    }

    reset() {
        this.name = '';
        this.date = new Date(0);
        this.number = '';
        this.lane = '';
        this.size = '';
    }
}

module.exports = Barcode;