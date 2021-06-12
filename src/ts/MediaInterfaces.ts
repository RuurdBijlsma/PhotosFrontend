import {Media} from "@/ts/Media";
export interface ILayoutMedia {
    media: Media,
    visualWidth: number,
    visualHeight:number,
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
