/* ============================================================
   The Fun Space - shared topbar
   Add to ANY page with one line, just before </body>:
       <script src="topbar.js"></script>
   (use "../topbar.js" etc. if the page is inside a folder)

   Adding a page later? Add one line to PAGES below. Done.
   ============================================================ */
(function () {
  // ---- EDIT THIS LIST to add buttons --------------------------------
  // href is relative to the folder that holds topbar.js and logo.svg
  var PAGES = [
    { label: 'Home', href: './' },
    { label: 'Beam TMA', href: 'beam-tma.html' }
    // { label: 'Events',     href: 'events.html' },
    // { label: 'Game Night', href: 'game-night.html' },
  ];
  var SITE_NAME = 'The Fun Space';
  // Paste your Cloudflare Worker URL here (see backend README). Leave '' to disable admin features.
  var API_URL = 'funspace-api.ethantburke2005-433.workers.dev';
  // --------------------------------------------------------------------

  if (document.querySelector('fun-topbar')) return; // never add twice

  var me = document.currentScript || document.querySelector('script[src$="topbar.js"]');
  var base = new URL('.', me.src);                  // folder of topbar.js
  var logo = new URL('logo.svg', base).href;

  // Fredoka font (used by the bar and the site)
  if (!document.querySelector('link[href*="family=Fredoka"]')) {
    var f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&display=swap';
    document.head.appendChild(f);
  }

  function norm(p) { return p.replace(/index\.html$/, '').replace(/\/+$/, ''); }
  var here = norm(location.pathname);
  var tok = function () { return sessionStorage.getItem('fs_token'); };
  // Shared helper for pages: FunSpace.call('/api/...', {method, body}) sends the login token.
  window.FunSpace = {
    api: API_URL.replace(/\/$/, ''),
    call: function (path, opt) {
      opt = opt || {};
      return fetch(this.api + path, { method: opt.method || 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (tok() || '') },
        body: opt.body ? JSON.stringify(opt.body) : undefined
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (r.status === 401) { sessionStorage.removeItem('fs_token'); if (!/login\.html$/.test(location.pathname)) location.replace(new URL('login.html', base).href); }
          if (!r.ok) throw new Error(d.error || 'Request failed');
          return d;
        });
      });
    }
  };

  var links = PAGES.map(function (p) {
    var url = new URL(p.href, base);
    var current = norm(url.pathname) === here;
    return '<a class="nav-btn" href="' + url.href + '"' + (current ? ' aria-current="page"' : '') + '>' + p.label + '</a>';
  }).join('');

  var css = `
  :host{position:fixed;top:0;left:0;right:0;z-index:1000;display:block;
    --amber:#ffb347;--pink:#ff5fa2;--violet:#8a5cff;--cyan:#4de8ff;--ink:#fff7ff;
    --display:"Fredoka","Trebuchet MS",system-ui,sans-serif}
  *{box-sizing:border-box;margin:0}
  header{position:relative;display:flex;align-items:center;justify-content:space-between;gap:1rem;
    padding:.7rem clamp(1rem,4vw,2.5rem);
    background:rgba(20,10,48,.45);border-bottom:1px solid rgba(255,255,255,.12);
    backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);
    box-shadow:0 8px 40px rgba(0,0,0,.3);animation:drop .7s cubic-bezier(.2,1.2,.4,1) both}
  @keyframes drop{from{transform:translateY(-100%)}}
  header::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;opacity:.8;
    background:linear-gradient(90deg,var(--amber),var(--pink),var(--violet),var(--cyan),var(--amber));
    background-size:200% 100%;animation:shine 8s linear infinite}
  @keyframes shine{to{background-position:-200% 0}}
  .brand{display:flex;align-items:center;gap:.7rem;color:var(--ink);text-decoration:none;
    font-family:var(--display);font-weight:700;font-size:1.3rem;border-radius:.8rem}
  .brand img{width:44px;height:44px;border-radius:30%;filter:drop-shadow(0 4px 14px rgba(255,95,162,.55));
    transition:transform .4s cubic-bezier(.2,1.6,.4,1)}
  .brand:hover img{transform:rotate(-10deg) scale(1.12)}
  nav{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:flex-end}
  .nav-btn{font-family:var(--display);font-weight:500;font-size:1.05rem;color:var(--ink);text-decoration:none;
    padding:.55rem 1.3rem;border-radius:999px;border:1px solid rgba(255,255,255,.18);
    background:rgba(255,255,255,.07);
    transition:transform .25s cubic-bezier(.2,1.6,.4,1),background .25s,box-shadow .25s}
  .nav-btn:hover{transform:translateY(-2px);background:rgba(255,255,255,.16);box-shadow:0 8px 24px rgba(138,92,255,.45)}
  .nav-btn[aria-current="page"]{background:linear-gradient(120deg,var(--pink),var(--violet));
    border-color:transparent;box-shadow:0 6px 22px rgba(255,95,162,.4)}
  button.nav-btn{cursor:pointer}
  .nav-btn.danger{border-color:rgba(255,107,129,.6);color:#ffb3c0}
  .nav-btn.danger:hover{background:rgba(255,107,129,.25);box-shadow:0 8px 24px rgba(255,107,129,.4)}
  a:focus-visible,button:focus-visible{outline:3px solid var(--cyan);outline-offset:3px}
  @media (max-width:520px){.brand span{display:none}}
  @media (prefers-reduced-motion:reduce){*,*::after{animation:none!important;transition:none!important}}
  `;

  var host = document.createElement('fun-topbar');
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<style>' + css + '</style>' +
    '<header>' +
      '<a class="brand" href="' + base.href + '" aria-label="' + SITE_NAME + ' home">' +
        '<img src="' + logo + '" alt="" width="44" height="44"><span>' + SITE_NAME + '</span>' +
      '</a>' +
      '<nav aria-label="Main">' + links + '</nav>' +
    '</header>';
  document.body.prepend(host);

  var FS = window.FunSpace;
  if (FS.api) {
    // heartbeat so admins can see who is on the site
    var ping = function () {
      if (document.hidden) return;
      fetch(FS.api + '/api/ping', { method: 'POST', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ page: location.pathname }), keepalive: true }).catch(function () {});
    };
    ping(); setInterval(ping, 30000);
    // logged in? show Admin Controls + Logout
    if (tok()) FS.call('/api/me').then(function () {
      var nav = root.querySelector('nav');
      var a = document.createElement('a');
      a.className = 'nav-btn'; a.textContent = 'Admin Controls'; a.href = new URL('admin.html', base).href;
      if (norm(new URL(a.href).pathname) === here) a.setAttribute('aria-current', 'page');
      var b = document.createElement('button');
      b.className = 'nav-btn danger'; b.textContent = 'Logout';
      b.onclick = function () {
        FS.call('/api/logout', { method: 'POST' }).catch(function () {}).then(function () {
          sessionStorage.removeItem('fs_token'); location.href = base.href; });
      };
      nav.appendChild(a); nav.appendChild(b);
    }).catch(function () {});
  }

  // Tell the page how tall the bar is, so content can sit below it:
  //   body { padding-top: var(--topbar-h); }
  function size() { document.documentElement.style.setProperty('--topbar-h', host.offsetHeight + 'px'); }
  size(); addEventListener('resize', size); addEventListener('load', size);
})();
