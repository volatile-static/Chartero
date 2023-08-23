import type { ReactElement } from "react";
const React = window.React, ReactDOM: ReactDOM = (window as any).ReactDOM;

/**
 * 毫秒级刷新
 */
export default function renderMinimap(
    reader: _ZoteroTypes.ReaderInstance
): void {
    const doc = reader._iframeWindow!.document,
        container = doc.getElementById('chartero-minimap-container');
    if (!container) return;

    ReactDOM.render(<Minimap
        itemID={reader.itemID!}
        numPages={reader._state.primaryViewStats.pagesCount!}
        annotations={reader._state.annotations}
        pageHeight={
            (reader._primaryView as _ZoteroTypes.Reader.PDFView)
                ._iframeWindow!.PDFViewerApplication.pdfViewer._pages.map(
                    (p: any) => p.viewport.viewBox[3]
                )
        }
    /> as ReactElement, container);
}

function Minimap({ itemID, numPages, annotations, pageHeight }: {
    itemID: number,
    numPages: number,
    annotations: Array<_ZoteroTypes.anyObj>,
    pageHeight: number[]
}) {
    const history = addon.history.getByAttachment(itemID),
        seconds = history?.record.pageArr.map(p => p.totalS),
        maxSeconds = seconds?.reduce((a, b) => Math.max(a ?? 0, b ?? 0), 0),
        annArr: Array<AnnotationInfo[] | null> =
            new Array<AnnotationInfo[]>(numPages);
    // 将注释对应到页码
    for (const ann of annotations)
        ann.type != 'ink' && (annArr[ann.position.pageIndex] ??= []).push({
            color: ann.color,
            rects: ann.position.rects
        });
    return <>{pageHeight.map((height, i) => {
        let val = (history && maxSeconds) ?
            200 * (1 - (history.record.pages[i]?.totalS ?? 0) / maxSeconds)
            : 255;
        // 暗黑模式下反色
        if (addon.getPref('useDarkTheme'))
            val = 255 - val;
        return <div
            className="chartero-minimap-page"
            style={{
                backgroundColor: `rgb(${val}, ${val}, ${val})`,
                height: `${100 / numPages}%`
            }}
        >{(annArr[i] ?? []).flatMap(ann => ann.rects.map(rect => <div
            className="chartero-minimap-note"
            style={{
                backgroundColor: ann.color,
                height: `${100 * Math.abs(rect[3] - rect[1]) / height}%`,
                bottom: `${100 * rect[1] / height}%`,
            }}
        ></div>))}</div>
    })}</>;
}

interface AnnotationInfo {
    color: string,
    rects: Array<[
        left: number,
        bottom: number,
        right: number,
        top: number
    ]>
}
