import {ILayoutMedia} from "@/ts/ILayoutMedia";

export interface ILayoutBlock {
    layoutMedias: ILayoutMedia[],
    day: string,
    month: number,
    width: number,
    height: number,
    hideDate: boolean,
    date: number,
}
