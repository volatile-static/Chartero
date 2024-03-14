import renderMinimap from "./components";
import stylesheet from "./minimap.sass";

export function mountMinimap(reader: _ZoteroTypes.ReaderInstance) {
    const doc = reader._iframeWindow!.document,
        outerContainer = doc.getElementById('primary-view');
    addon.ui.appendElement(
        {
            tag: 'style',
            namespace: 'html',
            properties: { textContent: stylesheet },
            ignoreIfExists: true,
        },
        doc.head
    );
    addon.ui.appendElement({
        tag: 'div',
        id: 'chartero-minimap-container',
        removeIfExists: true
    }, outerContainer!);
    updateMinimap(reader);
}

export function updateMinimap(reader: _ZoteroTypes.ReaderInstance) {
    const doc = reader._iframeWindow!.document,
        container = doc.getElementById('chartero-minimap-container');
    if (!container || reader.type == 'snapshot') return;

    // 共用的变量：总页数、背景色、注释
    const numPages = reader._state.primaryViewStats.pagesCount!,
        annotations = reader._state.annotations,
        history = addon.history.getByAttachment(reader.itemID!),
        seconds = history?.record.pageArr.map(p => p.totalS),
        maxSeconds = seconds?.reduce((a, b) => Math.max(a ?? 0, b ?? 0), 0),
        background = new Array<number>(numPages).fill(0).map((_, i) => {
            let val = (history && maxSeconds) ?
                200 * (1 - (history.record.pages[i]?.totalS ?? 0) / maxSeconds)
                : 255;
            // 暗黑模式下反色
            if (Zotero.getMainWindow().matchMedia('(prefers-color-scheme: dark)').matches)
                val = 255 - val;
            return val;
        }),
        annArr: Array<AnnotationInfo[] | null> =
            new Array<AnnotationInfo[]>(numPages);

    if (reader.type == 'pdf') {
        const view = reader._primaryView as _ZoteroTypes.Reader.PDFView,
            pagesHeight = view._iframeWindow!.PDFViewerApplication.pdfViewer!
                ._pages!.map((p: any) => p.viewport.viewBox[3]);
        for (const ann of annotations) {
            const pos = ann.position as _ZoteroTypes.Reader.PDFPosition,
                arr = annArr[pos.pageIndex] ??= [];
            arr.push({
                color: ann.color ?? 'transparent',
                rects: ann.type == 'ink' ?
                    pos.paths!.map(path => {
                        // 寻找Path的边界
                        const y = path.filter((_, i) => i % 2 == 1);
                        return {
                            bottom: Math.min(...y),
                            top: Math.max(...y),
                        };
                    }) :
                    pos.rects?.map(r => ({
                        bottom: r[1],
                        top: r[3],
                    })) ?? [],
            });
        }
        renderMinimap(container, { background, pagesHeight, annotations: annArr });
    } else if (reader.type == 'epub') {
        if (reader.flowMode == 'paginated') {
            container.toggleAttribute('hidden', true);
            return;
        }
        container.toggleAttribute('hidden', false);
        const view = reader._primaryView as _ZoteroTypes.Reader.EPUBView,
            totalHeight = (view as any)
                ._sectionsContainer.getBoundingClientRect().bottom,
            mappingStr = (
                reader._state.primaryViewState as _ZoteroTypes.Reader.EPUBViewState
            ).savedPageMapping,
            mappingArr: Array<[cfi: string, idx: string]> =
                JSON.parse(mappingStr!)?.mappings,
            cfiArr = mappingArr?.sort((a, b) => parseInt(a[1]) - parseInt(b[1])),
            ranges = cfiArr?.map(map => view.getRange('epubcfi(' + map[0] + ')')),
            pagesHeight = ranges?.reduce((arr, range, i) => {
                if (i == 0 || !range || !ranges[i - 1]) return arr;
                return [...arr, range.getBoundingClientRect().y -
                    ranges[i - 1]!.getBoundingClientRect().y];
            }, [] as number[]) ?? [];
        // 相邻两页的差值
        pagesHeight.push(totalHeight - (ranges?.at(-1)?.getBoundingClientRect().bottom ?? 0));

        for (const ann of annotations) {
            const pos = ann.position as _ZoteroTypes.Reader.FragmentSelector,
                range = view.getRange(pos.value),
                rect = range?.getBoundingClientRect(),
                // 寻找当前注释所在的页码
                idx = ranges.findIndex(
                    r => r && r.compareBoundaryPoints(window.Range.END_TO_END, range!) > 0
                ) - 1,
                pageRect = ranges.at(idx)?.getBoundingClientRect(),
                arr = annArr[idx] ??= [];
            // epub暂时不存在ink注释
            arr.push({
                color: ann.color ?? 'transparent',
                rects: [{
                    bottom: (rect?.bottom ?? 0) - (pageRect?.top ?? 0),
                    top: (rect?.top ?? 0) - (pageRect?.top ?? 0),
                }],
            });
        }
        renderMinimap(container, { background, pagesHeight, annotations: annArr });
    }
}

export interface AnnotationInfo {
    color: string;
    rects: Array<{ bottom: number, top: number }>;
}
