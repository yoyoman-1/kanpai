// 產生 SEO 用的靜態頁：games/（總覽）、games/<slug>/（各遊戲玩法）、business/（店家合作）、sitemap.xml
// 用法：node tools/build-pages.mjs（改了題庫或文案後重跑一次再 commit）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SITE = 'https://yoyoman-1.github.io/kanpai/';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// 從 index.html 取出題庫（只 eval 資料區段）
const seg = (start) => { const a = src.indexOf(start); const b = src.indexOf('registerGame(', a); return src.slice(a, b); };
const data = new Function(`${seg('const WHEEL_DEFAULT')}${seg('const TD_DEFAULT')}${seg('const WORD_PAIRS')}${seg('const WML_RAW')}${seg('const DRAW_LEVELS')}
${src.slice(src.indexOf('const ZY_KEYS'), src.indexOf('registerGame(', src.indexOf('const ZY_KEYS')))}
return { WHEEL_DEFAULT, TD_DEFAULT, WORD_PAIRS, WML, DRAW_WORDS, ZY_SETS };`)();

let seed = 20261026;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sample = (arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
const plain = t => t.replace(/\{人\}\s*/g, '你').replace(/\{左\}\s*/g, '左邊的人').replace(/\{右\}\s*/g, '右邊的人').replace(/\{某人\}\s*/g, '指定的人');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const flat = o => Object.values(o).flat();
const tdAll = t => Object.values(data.TD_DEFAULT).flatMap(v => v[t]);

const GAMES = [
  { id: 'wheel', slug: 'punishment-wheel', name: '懲罰轉盤', kw: '喝酒懲罰轉盤', count: `${data.WHEEL_DEFAULT.length} 題`, players: '2 人以上',
    intro: '手機放桌上輪流轉，轉到什麼懲罰就做什麼：直接喝、指定別人喝、酒桌新規則、真心話、大冒險都在裡面。題目會自動代入在場玩家的名字，還能自己新增題目。',
    rules: ['先輸入玩家名字（照座位順時針），「左邊、右邊」的懲罰會照這個順序算。', '輪到的人按「轉！」，轉盤停在哪一格就做哪一格。', '轉盤每次從題庫隨機抽 12 題放上去，同一晚很少重複。', '想加自己的懲罰，打開「編輯轉盤題庫」一行寫一題。'],
    examples: () => sample(data.WHEEL_DEFAULT, 10) },
  { id: 'bomb', slug: 'number-bomb', name: '終極密碼', kw: '終極密碼 喝酒', count: '1–100 或 1–1000', players: '2 人以上',
    intro: '手機自動出一個密碼數字，大家輪流猜，範圍越縮越小，猜中密碼的人就是「炸彈」，要喝。數字範圍可選 1–100 或 1–1000。',
    rules: ['手機隨機選一個密碼，不會讓任何人看到。', '輪到的人輸入一個範圍內的數字，手機會告訴大家太大還是太小。', '範圍一直縮小，最後猜中密碼的人爆炸，喝！', '剩最後一個數字時手機會提醒：下一位必中。'],
    examples: () => ['範圍 1～100，阿凱猜 50：太大了 → 範圍變 1～50', '小美猜 25：太小了 → 範圍變 25～50', '大雄猜 37：炸！密碼就是 37，大雄喝'] },
  { id: 'td', slug: 'truth-or-dare', name: '真心話大冒險', kw: '真心話大冒險 題目', count: `${tdAll('truth').length + tdAll('dare').length} 題`, players: '2 人以上',
    intro: '經典的真心話大冒險，題目全部精選過、從微醺到限制級混在一起抽。不想回答或不敢做？喝兩口跳過。',
    rules: ['輪到的人選「真心話」或「大冒險」，也可以按「讓命運決定」。', '手機抽一題，題目會代入在場玩家的名字。', '做不到或不想回答就喝兩口跳過。', '可以在「編輯題庫」加入你們自己的梗。'],
    examples: () => [...sample(tdAll('truth'), 5).map(t => `真心話：${t}`), ...sample(tdAll('dare'), 5).map(t => `大冒險：${t}`)] },
  { id: 'spy', slug: 'who-is-the-spy', name: '誰是臥底', kw: '誰是臥底 詞庫', count: `${data.WORD_PAIRS.length} 組詞`, players: '4 人以上',
    intro: '每個人輪流看手機拿到一個詞，其中一人拿到的詞不一樣，他就是臥底。大家輪流描述自己的詞，再投票抓出臥底，被抓錯的人喝。',
    rules: ['手機傳一圈，每個人偷看自己的詞，看完蓋起來交給下一位。', '大家輪流用一句話描述自己的詞，不能直接說出來。', '描述完投票，票最多的人出局，翻開看是不是臥底。', '平民抓到臥底，臥底喝；臥底撐到最後，平民全部喝。'],
    examples: () => sample(data.WORD_PAIRS, 10).map(p => Array.isArray(p) ? `${p[0]} ／ ${p[1]}` : String(p)) },
  { id: 'wml', slug: 'most-likely', name: '誰最可能', kw: '誰最可能 題目', count: `${flat(data.WML).length} 題`, players: '3 人以上',
    intro: '手機出一題「誰最可能……」，大家數到三一起指向一個人，被指最多的喝。分成老朋友、生活、喝酒、戀愛、限制級、社會等分類，可以自己勾選。',
    rules: ['先勾選想玩的分類。', '手機出題，大家數「一、二、三」一起指人。', '被指最多的人喝，平手的一起喝。', '按「下一題」繼續。'],
    examples: () => sample(flat(data.WML), 10).map(t => `誰最可能${t}？`) },
  { id: 'draw', slug: 'draw-and-guess', name: '你畫我猜', kw: '你畫我猜 題目', count: `${flat(data.DRAW_WORDS).length} 個題目`, players: '3 人以上',
    intro: '一個人看題目在手機上畫，其他人搶答，猜到就換下一位。題目分簡單、普通、困難三種難度，沒有時間限制。',
    rules: ['輪到畫的人先看題目（其他人不要偷看）。', '在手機畫布上畫，不能寫字。', '大家搶答，猜到就換下一位畫。', '一直猜不到的話，畫的人喝；可以自己約定其他懲罰。'],
    examples: () => sample(flat(data.DRAW_WORDS), 12) },
  { id: 'liar', slug: 'liars-dice', name: '吹牛', kw: '吹牛 骰子 喝酒', count: '每人 5 顆骰子', players: '每人一支手機',
    intro: '每個人用自己的手機當骰盅，甩手機或點一下就搖骰。大家輪流喊「幾個幾」，覺得對方在唬爛就開，輸的喝。',
    rules: ['每個人都打開網站進「吹牛」，用自己的手機當骰盅。', '搖骰後點骰盅偷看自己的點數，別給別人看。', '輪流喊數（例如「三個五」），下一位只能喊更大的，或選擇開。', '開了之後大家翻開數，喊錯的喝；喊對的話開的人喝。'],
    examples: () => ['阿凱：「三個四」', '小美：「四個四」', '大雄：「開！」→ 大家翻開，總共只有三個四，小美喝'] },
  { id: 'zhuyin', slug: 'zhuyin-quiz', name: '注音快答', kw: '注音 猜詞遊戲', count: `${data.ZY_SETS[2].length + data.ZY_SETS[3].length + data.ZY_SETS[4].length} 組`, players: '2 人以上',
    intro: '手機秀出注音開頭，例如「ㄇㄐ」，大家搶答說出符合的詞：面積、美金、墨鏡…。可以選 2 個、3 個或 4 個注音（4 個是成語）。',
    rules: ['選擇注音個數：2 個、3 個或 4 個（成語）。', '手機出題，大家搶答說出符合的詞。', '最後一個說不出來、或說錯的人喝。', '按「下一題」換題。'],
    examples: () => [...sample(data.ZY_SETS[2], 6), ...sample(data.ZY_SETS[3], 3), ...sample(data.ZY_SETS[4], 3)] },
  { id: 'mines', slug: 'minesweeper', name: '踩地雷', kw: '踩地雷 喝酒遊戲', count: '5×5 格', players: '2 人以上',
    intro: '25 個格子裡藏著地雷和大冒險，大家輪流翻一格。翻到數字代表旁邊有幾顆雷，踩到地雷的人喝，翻到大冒險就要照做。',
    rules: ['選擇地雷數（1、3、5 顆）和大冒險格數。', '輪流點一格翻開，數字是周圍 8 格有幾顆雷。', '踩到地雷的人喝；翻到大冒險要照做，做不到喝兩口。', '地雷全部被踩完就結束，按「再來一局」。'],
    examples: () => ['數字 1：旁邊 8 格裡有 1 顆雷', '空白：旁邊完全沒有雷，安全', '💣：踩到了，喝！', '🃏：大冒險，例如「' + plain(sample(tdAll('dare'), 1)[0]) + '」'] },
];

const css = `
:root{--bg:#1a100b;--surface:#2a1a11;--line:#4d3324;--amber:#f2a33a;--foam:#fbf0dc;--muted:#c2a68a;--ink:#23140b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--foam);font:17px/1.75 "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif}
main{max-width:720px;margin:0 auto;padding:20px 16px 48px}a{color:var(--amber)}
nav.crumb{font-size:.88rem;color:var(--muted)}nav.crumb a{color:var(--muted)}
h1{font-size:clamp(1.8rem,7vw,2.4rem);line-height:1.25;margin:10px 0 8px;color:var(--amber)}h2{font-size:1.25rem;margin:32px 0 8px}
.lead{color:var(--foam);font-size:1.05rem}.meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.meta span{background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:.88rem;color:var(--muted)}
.cta{display:block;text-align:center;background:var(--amber);color:var(--ink);font-weight:900;font-size:1.2rem;border-radius:16px;padding:16px;margin:22px 0;text-decoration:none;box-shadow:0 4px 0 #b86a17}
ol,ul{padding-left:1.3em}li{margin:4px 0}.ex li{color:var(--foam)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:0;list-style:none}
.grid a{display:block;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;text-decoration:none;color:var(--foam)}
.grid b{color:var(--amber)}.grid small{display:block;color:var(--muted);line-height:1.5;margin-top:4px}
.price{background:var(--surface);border:2px solid var(--amber);border-radius:18px;padding:16px 18px}.price b{font-size:1.6rem;color:var(--amber)}
footer{color:var(--muted);font-size:.8rem;text-align:center;margin-top:40px}`;

const page = ({ path, title, desc, body, ld }) => `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="website"><meta property="og:site_name" content="乾杯遊戲機">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}"><meta property="og:image" content="${SITE}og.png?v=9"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1a100b"><link rel="icon" href="${'../'.repeat(path.split('/').filter(Boolean).length)}icon-192.png" type="image/png">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : ''}
<style>${css}</style>
</head>
<body><main>
${body}
<footer>未滿 18 歲請勿飲酒・喝酒不開車，開車不喝酒・飲酒過量，有害健康<br><a href="${SITE}">乾杯遊戲機</a>｜<a href="${SITE}games/">喝酒遊戲玩法</a>｜<a href="${SITE}business/">店家合作</a></footer>
</main></body></html>
`;

const write = (path, html) => { mkdirSync(new URL(`../${path}`, import.meta.url), { recursive: true }); writeFileSync(new URL(`../${path}index.html`, import.meta.url), html); };

// 各遊戲頁
for (const g of GAMES) {
  const others = GAMES.filter(x => x !== g);
  const ex = g.examples().map(plain);
  write(`games/${g.slug}/`, page({
    path: `games/${g.slug}/`,
    title: `${g.name}怎麼玩？線上${g.kw}（免下載）｜乾杯遊戲機`,
    desc: `${g.name}玩法、規則和題目範例。${g.intro.slice(0, 60)}… 手機打開就能玩，免下載免註冊。`,
    ld: { '@context': 'https://schema.org', '@type': 'HowTo', name: `${g.name}怎麼玩`, inLanguage: 'zh-TW', step: g.rules.map((r, i) => ({ '@type': 'HowToStep', position: i + 1, text: r })) },
    body: `<nav class="crumb"><a href="../../">乾杯遊戲機</a> › <a href="../">喝酒遊戲玩法</a> › ${esc(g.name)}</nav>
<h1>${esc(g.name)}｜線上${esc(g.kw)}</h1>
<p class="lead">${esc(g.intro)}</p>
<div class="meta"><span>人數：${esc(g.players)}</span><span>${esc(g.count)}</span><span>免下載・免註冊</span></div>
<a class="cta" href="../../?g=${g.id}">馬上開始玩${esc(g.name)} →</a>
<h2>${esc(g.name)}玩法規則</h2>
<ol>${g.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
<h2>題目範例</h2>
<ul class="ex">${ex.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
<a class="cta" href="../../?g=${g.id}">打開${esc(g.name)}，今晚就玩 →</a>
<h2>其他喝酒遊戲</h2>
<ul class="grid">${others.map(o => `<li><a href="../${o.slug}/"><b>${esc(o.name)}</b><small>${esc(o.intro.slice(0, 34))}…</small></a></li>`).join('')}</ul>`,
  }));
}

// 總覽頁：鎖定「喝酒遊戲」「喝酒遊戲推薦」
const faq = [
  ['喝酒遊戲要下載 App 嗎？', '不用。用手機瀏覽器打開乾杯遊戲機就能玩，也不用註冊。想常常玩可以「加到主畫面」。'],
  ['人很少可以玩什麼？', '2 個人可以玩懲罰轉盤、終極密碼、真心話大冒險、踩地雷、注音快答；吹牛每個人用自己的手機就能玩。'],
  ['人很多適合玩什麼？', '4 人以上推薦誰是臥底；3 人以上推薦誰最可能、你畫我猜，人越多越好笑。'],
  ['不想喝酒也能玩嗎？', '可以，把「喝一口」換成喝飲料、做伏地挺身或其他懲罰就好。量力而為，不想喝可以說不。'],
];
write('games/', page({
  path: 'games/',
  title: '喝酒遊戲推薦｜9 款手機喝酒遊戲玩法大全（免下載）｜乾杯遊戲機',
  desc: '聚會喝酒玩什麼？懲罰轉盤、踩地雷、真心話大冒險、誰是臥底、誰最可能、終極密碼、你畫我猜、吹牛、注音快答，9 款喝酒遊戲玩法一次看，手機打開就能玩。',
  ld: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  body: `<nav class="crumb"><a href="../">乾杯遊戲機</a> › 喝酒遊戲玩法</nav>
<h1>喝酒遊戲推薦：9 款手機就能玩的派對遊戲</h1>
<p class="lead">聚會、夜衝、熱炒、KTV 不知道玩什麼？這 9 款喝酒遊戲都能用一支手機放桌上輪流玩，免下載、免註冊、不用準備撲克牌或骰子。</p>
<a class="cta" href="../">打開乾杯遊戲機，馬上開局 →</a>
<h2>9 款喝酒遊戲</h2>
<ul class="grid">${GAMES.map(g => `<li><a href="${g.slug}/"><b>${esc(g.name)}</b><small>${esc(g.players)}・${esc(g.count)}<br>${esc(g.intro.slice(0, 40))}…</small></a></li>`).join('')}</ul>
<h2>常見問題</h2>
${faq.map(([q, a]) => `<h3 style="font-size:1.05rem;margin:18px 0 4px">${esc(q)}</h3><p style="margin:0;color:var(--muted)">${esc(a)}</p>`).join('')}
<a class="cta" href="../">開始玩 →</a>`,
}));

// 店家合作頁
write('business/', page({
  path: 'business/',
  title: '店家專屬喝酒遊戲｜酒吧、熱炒、KTV 客製版｜乾杯遊戲機',
  desc: '讓客人掃桌上的 QR code，就能玩有你店名、Logo 和專屬優惠題目的喝酒遊戲。適合酒吧、熱炒店、KTV、居酒屋，首月免費試用。',
  body: `<nav class="crumb"><a href="../">乾杯遊戲機</a> › 店家合作</nav>
<h1>你的店，專屬的喝酒遊戲</h1>
<p class="lead">客人掃桌上的 QR code，打開就是有你店名、Logo 的乾杯遊戲機。懲罰轉盤裡混進你的專屬題目，例如「轉到的人去吧台說通關密語，換一杯 shot」，讓客人多點一輪。</p>
<a class="cta" href="../?shop=demo">看示範：店家版長怎樣 →</a>
<h2>你會拿到</h2>
<ul>
<li>專屬網址和桌上立牌用的 QR code，客人不用下載 App。</li>
<li>首頁顯示店名、Logo、主題色和今晚優惠（例如「生啤買二送一」）。</li>
<li>懲罰轉盤每輪固定混入 2 題你的店家題目，可以導向加點、打卡、通關密語。</li>
<li>9 款遊戲全部可用：懲罰轉盤、踩地雷、真心話大冒險、誰是臥底…</li>
<li>優惠和題目隨時可以請我們幫你改。</li>
</ul>
<h2>方案</h2>
<div class="price"><p style="margin:0">店家版</p><b>首月免費</b><p style="margin:4px 0 0;color:var(--muted)">之後每月 NT$490，隨時可以停。</p></div>
<h2>怎麼開始</h2>
<ol><li>私訊告訴我們店名、Logo 和想放的優惠。</li><li>1～2 天內給你專屬網址和 QR code。</li><li>試用一個月，覺得有幫助再付費。</li></ol>
<a class="cta" href="https://www.threads.com/@nc_tim" target="_blank" rel="noopener">私訊 Threads 洽談合作 →</a>
<p style="color:var(--muted);font-size:.9rem">本服務為派對遊戲工具，不販售酒類。店家提供的優惠內容須遵守菸酒管理法，並標示「禁止酒駕」「飲酒過量，有害健康」。</p>`,
}));

// sitemap
const urls = ['', 'games/', ...GAMES.map(g => `games/${g.slug}/`), 'business/'];
writeFileSync(new URL('../sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`);
console.log('pages:', urls.length);
