(() => {
    const btnViewImages = document.createElement('button'),
        btnLoadMore = document.createElement('button'),
        chartero_style = document.createElement('style'),
        imagesView = document.createElement('div'),
        btnAnnotations = document.querySelector('#toolbarSidebar #viewAnnotations'),  
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
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'%3E%3C!--! Font Awesome Free 6.2.1 by %40fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0  Fonts: SIL OFL 1.1  Code: MIT License) Copyright 2022 Fonticons  Inc. --%3E%3Cpath d='M512 32H160c-35.35 0-64 28.65-64 64v224c0 35.35 28.65 64 64 64H512c35.35 0 64-28.65 64-64V96C576 60.65 547.3 32 512 32zM528 320c0 8.822-7.178 16-16 16h-16l-109.3-160.9C383.7 170.7 378.7 168 373.3 168c-5.352 0-10.35 2.672-13.31 7.125l-62.74 94.11L274.9 238.6C271.9 234.4 267.1 232 262 232c-5.109 0-9.914 2.441-12.93 6.574L176 336H160c-8.822 0-16-7.178-16-16V96c0-8.822 7.178-16 16-16H512c8.822 0 16 7.178 16 16V320zM224 112c-17.67 0-32 14.33-32 32s14.33 32 32 32c17.68 0 32-14.33 32-32S241.7 112 224 112zM456 480H120C53.83 480 0 426.2 0 360v-240C0 106.8 10.75 96 24 96S48 106.8 48 120v240c0 39.7 32.3 72 72 72h336c13.25 0 24 10.75 24 24S469.3 480 456 480z' fill='%23555555'/%3E%3C/svg%3E");
    display: inline-block;
    vertical-align: top;
    width: 16px;
    height: 16px;
    content: "";
}

#viewImages.toggled::before {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'%3E%3C!--! Font Awesome Free 6.2.1 by %40fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0  Fonts: SIL OFL 1.1  Code: MIT License) Copyright 2022 Fonticons  Inc. --%3E%3Cpath d='M512 32H160c-35.35 0-64 28.65-64 64v224c0 35.35 28.65 64 64 64H512c35.35 0 64-28.65 64-64V96C576 60.65 547.3 32 512 32zM528 320c0 8.822-7.178 16-16 16h-16l-109.3-160.9C383.7 170.7 378.7 168 373.3 168c-5.352 0-10.35 2.672-13.31 7.125l-62.74 94.11L274.9 238.6C271.9 234.4 267.1 232 262 232c-5.109 0-9.914 2.441-12.93 6.574L176 336H160c-8.822 0-16-7.178-16-16V96c0-8.822 7.178-16 16-16H512c8.822 0 16 7.178 16 16V320zM224 112c-17.67 0-32 14.33-32 32s14.33 32 32 32c17.68 0 32-14.33 32-32S241.7 112 224 112zM456 480H120C53.83 480 0 426.2 0 360v-240C0 106.8 10.75 96 24 96S48 106.8 48 120v240c0 39.7 32.3 72 72 72h336c13.25 0 24 10.75 24 24S469.3 480 456 480z' fill='white'/%3E%3C/svg%3E");
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
    btnAnnotations.parentElement.insertBefore(btnViewImages, btnAnnotations);

    // 更新toolbutton切换的事件
    const btns = document.getElementById('toolbarSidebar').getElementsByTagName('button');
    for (const btn of btns)  // 给每个标签页按钮添加单击事件用于更新标签页选择状态
        btn.onclick = function () {
    console.debug(PDFViewerApplication);
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
})();
