const btnViewImages = document.createElement('button'),
    btnLoadMore = document.createElement('button'),
    chartero_style = document.createElement('style'),
    imagesView = document.createElement('div'),
    left = document.querySelector('#toolbarSidebarLeft #viewAnnotations'),  // TODO：right
    sidebarCont = document.getElementById('sidebarContent');
var images_page_loaded = 0;  // 记录预览图片加载了几页的全局变量

// 加载更多的图片
async function loadMoreImages() {
    btnLoadMore.style.display = 'none';  // 加载完毕后隐藏按钮
    await PDFViewerApplication.pdfLoadingTask.promise;
    await PDFViewerApplication.pdfViewer.pagesPromise;
    const setProgressmeter = charteroProgressmeter();

    for (
        let i = 0;
        i < 10 && images_page_loaded < PDFViewerApplication.pdfDocument.numPages;
        ++images_page_loaded
    ) {
        setProgressmeter(i * 10, images_page_loaded);
        const pdfPage = PDFViewerApplication.pdfViewer._pages[images_page_loaded].pdfPage,
            opList = await pdfPage.getOperatorList(),
            svgGfx = new pdfjsLib.SVGGraphics(pdfPage.commonObjs, pdfPage.objs),
            // 页面转换为svg
            svg = await svgGfx.getSVG(opList, pdfPage.getViewport({ scale: 1 })),
            urlArr = Array.prototype.map.call(
                svg.getElementsByTagName('svg:image'),
                i => i.getAttribute('xlink:href')
            );  // 获取所有图片的链接
        if (urlArr.length < 1 || urlArr.length > 60)  // 每页超过多少张图不显示
            continue;
        ++i;

        for (const url of urlArr) {
            const img = document.createElement('img'),
                linkService = PDFViewerApplication.pdfViewer.linkService;
            img.setAttribute('src', url);
            img.setAttribute('class', 'previewImg');
            img.setAttribute('title', '双击复制图片');
            img.onclick = function () {  // 点击跳转
                linkService.goToPage(pdfPage.pageNumber);
                return false;
            };
            img.ondblclick = function () {
                const canvas = document.createElement('canvas');
                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;
                canvas.getContext('2d').drawImage(this, 0, 0);
                zoteroCopyImage(canvas.toDataURL());
            }
            imagesView.insertBefore(img, btnLoadMore);
        }
        const hr = document.createElement('hr');
        hr.setAttribute('class', 'hr-text');
        hr.setAttribute('data-content', pdfPage.pageNumber);  // 页码分割线
        imagesView.insertBefore(hr, btnLoadMore);
    }
    setProgressmeter(100);
    if (images_page_loaded < PDFViewerApplication.pdfDocument.numPages)
        btnLoadMore.style.display = 'inline-block';
}

// 注入CSS文件
chartero_style.innerHTML = `
html[dir="rtl"] #viewImages.toolbarButton::before {
    transform: scaleX(-1);
}

#viewImages::before {
    background-image: url("file:///C:/Users/10430/Desktop/chartero/builds/addon/chrome/content/icons/images.png");
    display: inline-block;
    vertical-align: top;
    width: 16px;
    height: 16px;
    content: "";
}

#viewImages.toggled::before {
    background-image: url("chrome://chartero/content/icons/images-toggled.png");
}

#imagesView {
    overflow: auto;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    padding-bottom: 6px;
}

#imagesView #btnLoadMore {
    display: none;
    border-radius: 6%;
    border: 1px solid limegreen;
    background-color: palegreen;
    transition: all 0.2s;
    padding: 2px;
    margin: 6px;
    max-height: 20px;
    cursor: pointer;
}

#imagesView #btnLoadMore:hover {
    background-color: greenyellow;
    box-shadow: 0 12px 16px 0 rgba(0, 0, 0, 0.24), 0 17px 50px 0 rgba(0, 0, 0, 0.19);
}

#imagesView #btnLoadMore:active {
    background-color: green;
}

.previewImg {
    border: 1px solid gray;
    margin: 10px;
    transition: all 0.6s;
    overflow: hidden;
    cursor: pointer;
}

.previewImg:hover {
    box-shadow: 0 0 8px turquoise;
}

.hr-text {
    width: 100%;
    line-height: 1em;
    position: relative;
    outline: 0;
    border: 0;
    color: black;
    text-align: center;
    height: 1.5em;
    opacity: .5;
}

.hr-text::before {
    content: '';
    background: linear-gradient(to right, transparent, #818078, transparent);
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    height: 1px;
}

.hr-text::after {
    content: attr(data-content);
    position: relative;
    display: inline-block;
    color: black;

    padding: 0 .5em;
    line-height: 1.5em;
    color: #818078;
    background-color: #D2D8E2;
}
`;
document.head.appendChild(chartero_style);

// 添加页面容器
imagesView.id = 'imagesView';
imagesView.setAttribute('class', 'hidden');
sidebarCont.appendChild(imagesView);

// 点击加载更多
btnLoadMore.id = 'btnLoadMore';
btnLoadMore.innerHTML = 'Load more...';
btnLoadMore.onclick = loadMoreImages;
imagesView.appendChild(btnLoadMore);

// 添加toolbutton
btnViewImages.id = 'viewImages';
btnViewImages.setAttribute('class', 'toolbarButton');
btnViewImages.setAttribute('title', 'All images');  // TODO：locale
btnViewImages.setAttribute('tabindex', '-1');
btnViewImages.innerHTML = '<span>All images</span>';
left.parentElement.insertBefore(btnViewImages, left);

// 更新toolbutton切换的事件
const btns = document.getElementById('toolbarSidebarLeft').getElementsByTagName('button');
for (const btn of btns)  // 给每个标签页按钮添加单击事件用于更新标签页选择状态
    btn.onclick = function () {
        if (this.id === 'viewImages') {
            if (images_page_loaded < 1)
                loadMoreImages();

            // 随便给个序号得了……
            PDFViewerApplication.pdfSidebar.active = 6;
            for (const b of btns)
                b.classList.toggle('toggled', false);
            for (const v of sidebarCont.children)
                v.classList.toggle('hidden', true);
            this.classList.toggle('toggled', true);
            imagesView.classList.toggle('hidden', false);
        } else {  // 其他标签页有内置的事件在工作，无需干涉
            document.getElementById('viewImages').classList.toggle('toggled', false);
            imagesView.classList.toggle('hidden', true);
        }
    }
