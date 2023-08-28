import type { AnnotationInfo } from "./minimap";
import type { ReactElement } from "react";
const React = window.React, ReactDOM: ReactDOM = (window as any).ReactDOM;

/**
 * 毫秒级刷新
 */
export default function renderMinimap(
    container: HTMLElement,
    props: MinimapProps
) {
    if (__dev__)
        window.console.time('renderMinimap');
    try {
        ReactDOM.render(<Minimap
            background={props.background}
            pagesHeight={props.pagesHeight}
            annotations={props.annotations}
        /> as ReactElement, container);
    } catch (error) {
        addon.log(error);
    }
    finally {
        if (__dev__)
            window.console.timeEnd('renderMinimap');
    }
}

/**
 * background和pagesHeight的长度必须相同
 */
function Minimap({ background, pagesHeight, annotations }: MinimapProps) {
    const totalHeight = pagesHeight.reduce((a, b) => a + b, 0);
    return <>{
        pagesHeight.map((height, i) => <MinimapPage
            background={background[i]}
            height={height}
            totalHeight={totalHeight}
            annotations={annotations[i] ?? []}
        />)
    }</>;
}

function MinimapPage({ background, height, totalHeight, annotations }: {
    background: number,
    height: number,
    totalHeight: number,
    annotations: AnnotationInfo[]
}) {
    if (__dev__ && annotations.length)
        addon.log('MinimapPage', background, height, annotations);
    return <div
        className="chartero-minimap-page"
        style={{
            backgroundColor: `rgb(${background}, ${background}, ${background})`,
            height: `${height * 100 / totalHeight}%`
        }}
    >{
            annotations.flatMap(ann => [...ann.rects].map(rect => <div
                key={Zotero.randomString()}
                className="chartero-minimap-note"
                style={{
                    backgroundColor: ann.color,
                    height: `${Math.abs(rect.top - rect.bottom) / height}%`,
                    bottom: `${rect.bottom / height}%`,
                }}
            ></div>))
        }</div>
}

interface MinimapProps {
    background: number[];
    pagesHeight: number[];
    annotations: Array<AnnotationInfo[] | null>;
}
