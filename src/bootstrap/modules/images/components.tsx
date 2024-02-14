import { ClipboardHelper } from 'zotero-plugin-toolkit/dist/helpers/clipboard';
const React = window.React,
    ReaderContext = React.createContext<(position: _ZoteroTypes.Reader.PDFPosition) => void>(() => {});

export type LoadedPages = Record<
    number,
    {
        numImages: number;
        loadedImages: Array<{
            data: ImageBitmap;
            // path: string;
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
        // path: string;
        rect: number[];
    }>;
}) {
    return (
        <>
            {props.loadedImages.map((img, idx) => (
                <Image
                    key={idx}
                    data={img.data}
                    // path={img.path}
                    position={{ pageIndex: props.index, rects: [img.rect] }}
                />
            ))}
            <hr data-content={props.index + 1} className="hr-text" />
        </>
    );
}

function Image({
    position,
    data,
}: {
    data: ImageBitmap;
    // path: string;
    position: _ZoteroTypes.Reader.PDFPosition;
}) {
    const canvas = React.useRef<HTMLCanvasElement>(null);
    const onNavigate = React.useContext(ReaderContext);
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
    // window.console.log(path);
    // return (
    //     <img
    //         src='resource://chartero/pdf.png'
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
