export default class MediaItem {
    public id: string;
    public filename: string;
    public width: number;
    public height: number;

    constructor(id: string, filename: string, width: number, height: number) {
        this.id = id;
        this.filename = filename;
        this.width = width;
        this.height = height;
    }
}
