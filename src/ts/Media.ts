import {parse, addMinutes} from "date-fns";

export type MediaType = 'photo' | 'video';
export type MediaSubType = 'none' | 'portrait' | 'vr' | 'slomo';

export interface Classification {
    confidence: number,
    levels: { labels: string[], glossary: string, level: number }[]
}

export interface Location {
    latitude: number,
    longitude: number,
    altitude: number,
    places: { type: string, name: string }[],
}

export class Media {
    id: string;
    createDate: Date;
    width: number;
    height: number;
    type: MediaType;
    subType: MediaSubType;
    duration: number | null;

    classifications: Classification[] | null;
    location: Location | null;
    filename: string | null;
    size: number | null;
    exif: any;

    constructor(id: string,
                filename: string,
                createDate: Date,
                width: number,
                height: number,
                type: MediaType,
                subType: MediaSubType,
                duration: number | null = null,
                classifications: Classification[] | null = null,
                location: Location | null = null,
                size: number | null = null,
                exif: any = {}) {
        this.id = id;
        this.filename = filename;
        this.createDate = createDate;
        this.width = width;
        this.height = height;
        this.type = type;
        this.duration = duration;
        this.subType = subType;
        this.classifications = classifications;
        this.location = location;
        this.size = size;
        this.exif = exif;
    }

    get ratio() {
        if (this.height === 0)
            return 1;
        return this.width / this.height;
    }

    static fromObject({
                          id = '',
                          filename = '',
                          createDateString = '',
                          width = 0,
                          height = 0,
                          type = '',
                          subType = '',
                          durationMs = null,
                          MediaClassifications = null as any,
                          MediaLocation = null as any,
                          bytes = '-1',
                          exif = {},
                      }) {
        subType = subType.toLowerCase();
        type = type.toLowerCase();
        let location: (Location | null) = MediaLocation ? {
            latitude: MediaLocation.latitude,
            longitude: MediaLocation.longitude,
            altitude: MediaLocation.altitude,
            places: MediaLocation.Places?.map?.((p: { type: string, text: string }) => ({
                type: p.type,
                name: p.text,
            })) as { type: string, name: string }[]
        } : null;
        let classifications: (Classification[] | null) = MediaClassifications ? MediaClassifications.map((c: any) => {
            let levels = {} as any;
            for (let {level, text} of c.Glossaries) {
                levels[level] = {glossary: text, level};
            }
            for (let {level, text} of c.Labels) {
                if (!levels[level].labels)
                    levels[level].labels = [];
                levels[level].labels.push(text);
            }
            return {
                confidence: c.confidence,
                levels: Object.values(levels),
            }
        }) : null;
        return new Media(id, filename, new Date(createDateString), width, height,
            type === 'image' ? 'photo' : 'video',
            (['portrait', 'vr', 'slomo'].includes(subType) ? subType : 'none') as MediaSubType,
            durationMs, classifications, location, isFinite(+bytes) ? +bytes : null, exif,
        )
    }
}
