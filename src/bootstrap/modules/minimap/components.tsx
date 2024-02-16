import type { AnnotationInfo } from './minimap';
const React = window.React,
    ReactDOM: ReactDOM = (window as any).ReactDOM;

/**
 * 毫秒级刷新
 */
export default function renderMinimap(container: HTMLElement, props: MinimapProps) {
    try {
        ReactDOM.render(
            <Minimap
                background={props.background}
                pagesHeight={props.pagesHeight}
                annotations={props.annotations}
            />,
            container,
        );
    } catch (error) {
        addon.log(error);
    }
}

/**
 * background和pagesHeight的长度必须相同
 */
function Minimap({ background, pagesHeight, annotations }: MinimapProps) {
    const totalHeight = pagesHeight.reduce((a, b) => a + b, 0);
    return (
        <>
            {pagesHeight.map((height, i) => (
                <MinimapPage
                    key={Zotero.randomString()}
                    background={background[i]}
                    height={height}
                    totalHeight={totalHeight}
                    annotations={annotations[i] ?? []}
                />
            ))}
        </>
    );
}

function MinimapPage({
    background,
    height,
    totalHeight,
    annotations,
}: {
    background: number;
    height: number;
    totalHeight: number;
    annotations: AnnotationInfo[];
}) {
    // if (__dev__ && annotations.length)
    //     addon.log('MinimapPage', background, height, JSON.stringify(annotations));
    return (
        <div
            className="chartero-minimap-page"
            style={{
                backgroundColor: `rgb(${background}, ${background}, ${background})`,
                height: `${(height * 100) / totalHeight}%`,
            }}
        >
            {annotations.flatMap(ann =>
                [...ann.rects].map(rect => (
                    <div
                        key={Zotero.randomString()}
                        className="chartero-minimap-note"
                        style={{
                            backgroundColor: ann.color,
                            top: `${(1 - rect.top / height) * 100}%`,
                            bottom: `${(rect.bottom / height) * 100}%`,
                        }}
                    ></div>
                )),
            )}
        </div>
    );
}

interface MinimapProps {
    background: number[];
    pagesHeight: number[];
    annotations: Array<AnnotationInfo[] | null>;
}
