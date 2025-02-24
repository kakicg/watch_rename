class Photo {
    constructor() {
        this.name = '';
        this.date = new Date(0);
        this.size = '';
    }

    reset() {
        this.name = '';
        this.date = new Date(0);
        this.size = '';
    }
}

module.exports = Photo;