export default function fetchSync(cmd: string) {
    const req = new XMLHttpRequest();
    req.open('POST', `http://localhost:23119/test/chartero`, false);
    req.send(cmd);
    return JSON.parse(req.responseText);
}
