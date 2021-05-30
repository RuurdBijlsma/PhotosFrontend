export type MediaType = 'photo' | 'video';
export type MediaSubType = 'none' | 'portrait' | 'vr' | 'slomo';

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
                          durationMs = null
                      }) {
        subType = subType.toLowerCase();
        type = type.toLowerCase();
        return new Media(id, filename, new Date(createDate), width, height,
            type === 'image' ? 'photo' : 'video',
            (['portrait', 'vr', 'slomo'].includes(subType) ? subType : 'none') as MediaSubType,
            durationMs,
        )
    }
}
