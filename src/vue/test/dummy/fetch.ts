export default function fetchSync(cmd: string) {
    if (import.meta.hot) if (import.meta.hot.data[cmd]) return import.meta.hot.data[cmd];

    const req = new XMLHttpRequest();
    req.open('POST', `http://localhost:23119/test/chartero`, false);
    req.send(cmd);
    const res = JSON.parse(req.responseText);
    if (import.meta.hot) import.meta.hot.data[cmd] = res;

    // console.groupCollapsed(cmd, res)
    // console.trace();
    // console.groupEnd();
    return res;
}
