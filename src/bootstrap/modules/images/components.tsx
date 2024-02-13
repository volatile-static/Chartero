import { ClipboardHelper } from 'zotero-plugin-toolkit/dist/helpers/clipboard';
const React = window.React,
    ReaderContext = React.createContext<(position: _ZoteroTypes.Reader.PDFPosition) => void>(() => {});

export type LoadedPages = Record<
    number,
    {
        numImages: number;
        loadedImages: Array<{
            data: ImageBitmap;
            rect: number[];
        }>;
    }
>;

export default function View(props: {
    pages: LoadedPages;
    onNavigate: (position: _ZoteroTypes.Reader.PDFPosition) => void;
}) {
    return (
        <ReaderContext.Provider value={props.onNavigate}>
            {Object.entries(props.pages).map(([index, page]) => (
                <Page key={index} index={Number(index)} loadedImages={page.loadedImages} />
            ))}
        </ReaderContext.Provider>
    );
}

function Page(props: {
    index: number;
    loadedImages: Array<{
        data: ImageBitmap;
        rect: number[];
    }>;
}) {
    return (
        <div>
            {props.loadedImages.map((img, idx) => (
                <Image key={idx} data={img.data} position={{ pageIndex: props.index, rects: [img.rect] }} />
            ))}
            <hr data-content={props.index + 1} className="hr-text" />
        </div>
    );
}

function Image({ data, position }: { data: ImageBitmap; position: _ZoteroTypes.Reader.PDFPosition }) {
    const canvas = React.useRef<HTMLCanvasElement>(null),
        onNavigate = React.useContext(ReaderContext);
    React.useEffect(() => {
        if (canvas.current) {
            const ctx = canvas.current.getContext('2d')!;
            canvas.current.width = data.width;
            canvas.current.height = data.height;
            ctx.drawImage(data, 0, 0);
        }
    }, [data]);

    // const canvas = document.createElement('canvas'),
    //     ctx = canvas.getContext('2d')!;
    // canvas.width = data.width;
    // canvas.height = data.height;
    // ctx.drawImage(data, 0, 0);
    // return (
    //     <img
    //         src={canvas.toDataURL()}
    //         className="previewImg"
    //         title={addon.locale.images.dblClickToCopy}
    //         onClick={() => onNavigate(position)}
    //     />
    // );
    return (
        <canvas
            ref={canvas}
            className="previewImg"
            title={addon.locale.images.dblClickToCopy}
            onClick={() => onNavigate(position)}
            onDoubleClick={() =>
                canvas.current && new ClipboardHelper().addImage(canvas.current.toDataURL()).copy()
            }
        />
    );
}
