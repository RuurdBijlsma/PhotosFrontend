import {Media} from "@/ts/Media";

export interface ILayoutMedia {
    media: Media,
    visualWidth: number,
    visualHeight: number,
}

export interface ILayoutBlock {
    layoutMedias: ILayoutMedia[],
    dateString: string,
    date: Date,
    width: number,
    height: number,
    showDate: boolean,
}

export interface ILayoutRow {
    layoutBlocks: ILayoutBlock[],
    hasDate: boolean,
    width: number,
    height: number,
}

export interface MonthPhotos {
    year: number,
    month: number,
    count: number,
    viewed: boolean,
    loaded: boolean,
    ready: boolean,
    height: number,
    photos: Media[],
    id: string,
}
