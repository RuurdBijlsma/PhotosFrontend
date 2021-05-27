export enum MediaType {
    Photo, Video,
}

export enum MediaSubType {
    None, Portrait, VR, Slomo,
}

export class Media {
    id: string;
    createDate: Date;
    width: number;
    height: number;
    type: MediaType;
    subType: MediaSubType;
    duration: number | null;

    filename: string | null;

    constructor(id: string, filename: string, createDate: Date,
                width: number, height: number, type: MediaType, subType: MediaSubType,
                duration = null) {
        this.id = id;
        this.filename = filename;
        this.createDate = createDate;
        this.width = width;
        this.height = height;
        this.type = type;
        this.duration = duration;
        this.subType = subType;
    }

    get ratio() {
        if (this.height === 0)
            return 1;
        return this.width / this.height;
    }

    static fromObject({
                          id = '',
                          filename = '',
                          createDate = '',
                          width = 0,
                          height = 0,
                          type = '',
                          subType = '',
                          duration = null
                      }) {
        let dictionary: { [index: string]: MediaSubType } = {
            'vr': MediaSubType.VR,
            'slomo': MediaSubType.Slomo,
            'portrait': MediaSubType.Portrait,
        }
        return new Media(id, filename, new Date(createDate), width, height,
            type === 'image' ? MediaType.Photo : MediaType.Video,
            dictionary[subType.toLowerCase()] ?? MediaSubType.None,
            duration,
        );
    }
}
