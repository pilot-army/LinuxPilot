import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOGIN_URL = 'http://127.0.0.1:5173/login';
const OUT_DIR = path.resolve(import.meta.dirname, '../screenshots/auth-capabilities');
const PORT = 9333;

const shots = [
  { name: 'desktop-1440x900-ua', width: 1440, height: 900, locale: 'uk' },
  { name: 'desktop-1440x900-en', width: 1440, height: 900, locale: 'en' },
  { name: 'tablet-landscape-1024x768', width: 1024, height: 768, locale: 'uk' },
  { name: 'tablet-portrait-768x1024', width: 768, height: 1024, locale: 'uk' },
  { name: 'mobile-390x844', width: 390, height: 844, locale: 'uk' },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // Chrome is still starting.
    }
    await wait(150);
  }
  throw new Error(`Chrome DevTools not ready at ${url}`);
}

function send(ws, method, params = {}) {
  const id = send.nextId;
  send.nextId += 1;
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) {
        return;
      }
      ws.removeEventListener('message', onMessage);
      if (message.error) {
        reject(new Error(`${method}: ${JSON.stringify(message.error)}`));
        return;
      }
      resolve(message.result);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
send.nextId = 1;

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  return ws;
}

async function capture(ws, shot) {
  await send(ws, 'Emulation.setDeviceMetricsOverride', {
    width: shot.width,
    height: shot.height,
    deviceScaleFactor: 1,
    mobile: shot.width < 800,
  });
  await send(ws, 'Page.enable');
  await send(ws, 'Runtime.enable');
  await send(ws, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('linuxpilot.locale', '${shot.locale}');`,
  });

  const navigated = new Promise((resolve) => {
    const onMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Page.loadEventFired') {
        ws.removeEventListener('message', onMessage);
        resolve();
      }
    };
    ws.addEventListener('message', onMessage);
  });

  await send(ws, 'Page.navigate', { url: LOGIN_URL });
  await navigated;
  await wait(900);

  const metrics = await send(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const doc = document.documentElement;
      const form = document.querySelector('form');
      const complementary = document.querySelector('aside');
      const formTop = form ? form.getBoundingClientRect().top : null;
      const asideTop = complementary ? complementary.getBoundingClientRect().top : null;
      const asideStyle = complementary ? getComputedStyle(complementary).display : 'missing';
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
        overflowX: doc.scrollWidth > doc.clientWidth + 1,
        overflowY: doc.scrollHeight > doc.clientHeight + 1,
        formTop,
        asideTop,
        asideDisplay: asideStyle,
        titles: [...document.querySelectorAll('h3')].map((node) => node.textContent),
      };
    })()`,
    returnByValue: true,
  });

  const screenshot = await send(ws, 'Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  const file = path.join(OUT_DIR, `${shot.name}.png`);
  await writeFile(file, Buffer.from(screenshot.data, 'base64'));
  return { file, metrics: metrics.result.value };
}

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/linuxpilot-auth-capabilities-chrome',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

try {
  await mkdir(OUT_DIR, { recursive: true });
  await waitForJson(`http://127.0.0.1:${PORT}/json/version`);
  const created = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await created.json();
  const ws = await connect(target.webSocketDebuggerUrl);
  const report = [];

  for (const shot of shots) {
    const result = await capture(ws, shot);
    report.push({ name: shot.name, ...result });
    console.log(`${shot.name}: ${result.file}`);
    console.log(JSON.stringify(result.metrics, null, 2));
  }

  ws.close();
  await writeFile(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(report, null, 2));
} finally {
  chrome.kill('SIGTERM');
}
