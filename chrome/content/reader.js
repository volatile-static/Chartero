const btn = document.createElement('button'),
    style = document.createElement('link'),
    view = document.createElement('div'),
    left = document.querySelector('#toolbarSidebarLeft #viewAnnotations'),  // TODO：right
    cont = document.getElementById('sidebarContent');

// 注入CSS文件
style.setAttribute('rel', 'stylesheet');
style.setAttribute('href', 'chrome://chartero/skin/reader.css');
document.head.appendChild(style);

// 添加页面容器
view.id = 'imagesView';
view.setAttribute('class', 'hidden');
cont.appendChild(view);

// 添加toolbutton
btn.id = 'viewImages';
btn.setAttribute('class', 'toolbarButton');
btn.setAttribute('title', 'All images');  // TODO：locale
btn.setAttribute('tabindex', '-1');
btn.innerHTML = '<span>All images</span>';
left.parentElement.insertBefore(btn, left);

// 更新toolbutton切换的事件
const btns = document.getElementById('toolbarSidebarLeft').getElementsByTagName('button');
for (const btn of btns)  // 给每个标签页按钮添加单击事件用于更新标签页选择状态
    btn.onclick = function () {
        if (this.id === 'viewImages') {
            // 随便给个序号得了……
            PDFViewerApplication.pdfSidebar.active = 6;
            for (const b of btns)
                b.classList.toggle('toggled', false);
            for (const v of cont.children)
                v.classList.toggle('hidden', true);
            this.classList.toggle('toggled', true);
            view.classList.toggle('hidden', false);
        } else {  // 其他标签页有内置的事件在工作，无需干涉
            document.getElementById('viewImages').classList.toggle('toggled', false);
            view.classList.toggle('hidden', true);
        }
    }

async function process() {
    let scanCnt = 0;
    await PDFViewerApplication.pdfViewer.pagesPromise;
    
    for (const pdfView of PDFViewerApplication.pdfViewer._pages) {
        const opList = await pdfView.pdfPage.getOperatorList(),
            svgGfx = new pdfjsLib.SVGGraphics(pdfView.pdfPage.commonObjs, pdfView.pdfPage.objs),
            svg = await svgGfx.getSVG(opList, pdfView.pdfPage.getViewport({ scale: 1 })), // 页面转换为svg
            urlArr = Array.prototype.map.call(
                svg.getElementsByTagName('svg:image'),
                i => i.getAttribute('xlink:href')
            );  // 获取所有图片的链接
        if (urlArr.length < 1 || urlArr.length > 20)  // 每页超过多少张图不显示
            continue;

        const i0 = svg.getElementsByTagName('svg:image')[0],
            pageIdx = pdfView.pdfPage._pageIndex + 1,  // 页码
            thumbnail = PDFViewerApplication.pdfThumbnailViewer.getThumbnail(pageIdx),
            imgRatio = i0.width.baseVal.value / i0.height.baseVal.value;

        if (Math.abs(imgRatio - thumbnail.pageRatio) < 0.1 && urlArr.length == 1) {
            if (scanCnt > 10) return;  // 判断是否为扫描pdf
            else ++scanCnt;
        }
        for (const url of urlArr) {
            const img = document.createElement('img'),
                linkService = PDFViewerApplication.pdfViewer.linkService;
            img.setAttribute('src', url);
            img.setAttribute('class', 'previewImg');
            img.onclick = function () {  // 点击跳转
                linkService.goToPage(pageIdx);
                return false;
            };
            img.ondblclick = function () {
                const canvas = document.createElement('canvas');
                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;
                canvas.getContext('2d').drawImage(this, 0, 0);
                zoteroCopyImage(canvas.toDataURL());
            }
            view.appendChild(img);
        }
        const hr = document.createElement('hr');
        hr.setAttribute('class', 'hr-text');
        hr.setAttribute('data-content', pageIdx);  // 页码分割线
        view.appendChild(hr);

        if (view.children.length > 60)  // 总共渲染多少
            return;
    }
}
// 添加所有图片 延迟100ms防止阻塞主页面加载
PDFViewerApplication.pdfLoadingTask.promise.then(doc => setTimeout(process, 100));
