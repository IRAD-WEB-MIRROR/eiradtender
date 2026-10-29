/* tender.e-irad.org, the State Procurement Portal. Reads data/tenders.json and data/suppliers.json; nothing typed is
   sent or stored. Bids are still lodged on paper, so there is no login and no bid form. */
(function () {
  "use strict";
  var LANGS = ["ir", "ru", "en"], LANG = "en";
  try { var sv = localStorage.getItem("eirad_lang"); if (LANGS.indexOf(sv) >= 0) LANG = sv; } catch (e) {}
  var q = new URLSearchParams(location.search); if (LANGS.indexOf(q.get("lang")) >= 0) LANG = q.get("lang");
  var PAGE = document.body.getAttribute("data-page");
  var D = null, S = null, SUP = {};
  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function L(o, v) { var s = typeof o === "string" ? o : (o[LANG] != null ? o[LANG] : o.en); return v ? String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : s; }
  function now() { var n = new Date(); return new Date(n.getTime() + n.getTimezoneOffset() * 60000 + 6 * 3600000); }
  function todayIso() { var d = now(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function dmy(s) { return s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : ""; }
  function num(x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, LANG === "en" ? "," : " "); }
  function som(x) { return num(x) + " " + L(T.som); }

  var T = {
    t1: { en: "State Procurement Portal", ir: "Mamlekettik satıp aluular portalı", ru: "Портал государственных закупок" },
    t2: { en: "Public Procurement Department, Ministry of Economy of the ISEZ", ir: "IAEZdin Ekonomika ministrligi, Mamlekettik satıp aluular departamenti", ru: "Департамент государственных закупок Министерства экономики ОЭЗИ" },
    eirad: { en: "part of e-Irad", ir: "e-Iraddın bölügü", ru: "часть портала e-Irad" },
    m_home: { en: "Home", ir: "Bashkı bet", ru: "Главная" },
    m_list: { en: "Tenders", ir: "Konkurstar", ru: "Закупки" },
    m_sup: { en: "Supplier register", ir: "Jetkiruuchülör reestri", ru: "Реестр поставщиков" },
    m_bl: { en: "Unreliable suppliers", ir: "Ishenimsiz jetkiruuchülör", ru: "Недобросовестные поставщики" },
    m_rules: { en: "Rules", ir: "Erejeler", ru: "Правила" },
    tick: { en: "NOTICE", ir: "KULAKTANDIRUU", ru: "ВНИМАНИЕ" },
    tickT: { en: "Bids are accepted on paper only, in a sealed envelope, at the address of the procuring entity before the deadline (Astana time, UTC+6). Electronic bidding will open in 2027. The portal is updated each working day by 18:00.", ir: "Arızdar kagaz türündö gana, möörlöngön konvertte, buyurtmachının darekine möönötkö cheyin kabıl alınat (Astana ubaktısı, UTC+6). Elektronduk konkurs 2027-jılı achılat. Portal ar bir jumush künü saat 18:00gö cheyin jañılanat.", ru: "Заявки принимаются только на бумаге, в запечатанном конверте, по адресу заказчика до окончания срока (время Астаны, UTC+6). Электронные торги откроются в 2027 году. Портал обновляется каждый рабочий день до 18:00." },
    foot: { en: "© 2015–2026 Public Procurement Department, Ministry of Economy of the ISEZ. Notices are published under the Public Procurement Act 2015. In case of any difference the paper notice kept by the procuring entity prevails. Helpline for suppliers: Talas 2-31-07-40, Mon–Fri 9:00–17:00.", ir: "© 2015–2026 IAEZdin Ekonomika ministrligi, Mamlekettik satıp aluular departamenti. Bildirüülör 2015-jılkı Mamlekettik satıp aluular jönündö aktka ılayık jariyalanat. Ayırmachılık bolso, buyurtmachıda saktalgan kagaz bildirüü koldonulat. Jetkiruuchülör üchün telefon: Talas 2-31-07-40, Dü–Ju 9:00–17:00.", ru: "© 2015–2026 Департамент государственных закупок Министерства экономики ОЭЗИ. Объявления публикуются согласно Закону о государственных закупках 2015 года. В случае расхождений действует бумажное объявление, хранящееся у заказчика. Телефон для поставщиков: Талас 2-31-07-40, пн–пт 9:00–17:00." },
    som: { en: "som", ir: "som", ru: "сом" },
    loading: { en: "Loading…", ir: "Jüktölüüdö…", ru: "Загрузка…" },
    nodata: { en: "The register could not be loaded. Please try again later.", ir: "Reestr jüktölgön jok. Kiyinchereek kayra arakettenip köröñüz.", ru: "Реестр не удалось загрузить. Повторите попытку позже." },
    // statuses
    s_open: { en: "Accepting bids", ir: "Arızdar kabıl alınuuda", ru: "Приём заявок" },
    s_eval: { en: "Evaluation", ir: "Baaloo", ru: "Оценка" },
    s_done: { en: "Contract signed", ir: "Kelishim tüzüldü", ru: "Договор заключён" },
    s_fail: { en: "Failed", ir: "Bolboy kaldı", ru: "Не состоялся" },
    s_canc: { en: "Cancelled", ir: "Jokko chıgarıldı", ru: "Отменён" },
    // columns
    c_no: { en: "No.", ir: "№", ru: "№" },
    c_title: { en: "Subject", ir: "Predmeti", ru: "Предмет закупки" },
    c_ent: { en: "Procuring entity", ir: "Buyurtmachı", ru: "Заказчик" },
    c_meth: { en: "Method", ir: "Ikma", ru: "Метод" },
    c_est: { en: "Estimate", ir: "Smeta", ru: "Сметная стоимость" },
    c_pub: { en: "Published", ir: "Jariyalandı", ru: "Опубликован" },
    c_dl: { en: "Deadline", ir: "Möönötü", ru: "Срок подачи" },
    c_st: { en: "Status", ir: "Abalı", ru: "Статус" },
    c_win: { en: "Winner", ir: "Jeñüüchü", ru: "Победитель" },
    c_amt: { en: "Contract amount", ir: "Kelishimdin summası", ru: "Сумма договора" },
    c_date: { en: "Date", ir: "Datası", ru: "Дата" },
    c_sup: { en: "Supplier", ir: "Jetkiruuchü", ru: "Поставщик" },
    c_price: { en: "Price offered", ir: "Sunulgan baa", ru: "Предложенная цена" },
    c_pct: { en: "% of estimate", ir: "Smetanın %", ru: "% от сметы" },
    c_res: { en: "Result", ir: "Natıyjası", ru: "Результат" },
    c_reg: { en: "Registered", ir: "Kattalgan", ru: "Дата регистрации" },
    c_addr: { en: "Legal address", ir: "Yuridikalık darek", ru: "Юридический адрес" },
    c_dir: { en: "Director", ir: "Direktor", ru: "Руководитель" },
    c_bids: { en: "Bids", ir: "Arızdar", ru: "Заявки" },
    c_wins: { en: "Contracts", ir: "Kelishimder", ru: "Договоры" },
    c_tot: { en: "Total contracted", ir: "Jalpı kelishimder", ru: "Сумма договоров" },
    c_from: { en: "Listed from", ir: "Tizmege kirgen", ru: "В реестре с" },
    c_to: { en: "until", ir: "Möönötü", ru: "по" },
    c_why: { en: "Grounds", ir: "Negizi", ru: "Основание" },
    all: { en: "all", ir: "baarı", ru: "все" },
    find: { en: "Find", ir: "Izdöö", ru: "Найти" },
    word: { en: "Word in subject or number", ir: "Predmettegi söz je nomer", ru: "Слово в предмете или номер" },
    shown: { en: "Found: {n}", ir: "Tabıldı: {n}", ru: "Найдено: {n}" },
    page: { en: "Page", ir: "Bet", ru: "Страница" },
    none: { en: "Nothing found.", ir: "Ech nerse tabılgan jok.", ru: "Ничего не найдено." }
  };

  function status(t) {
    if (t.cancelled) return "canc";
    if (t.failed) return "fail";
    if (t.open) return t.deadline >= todayIso() ? "open" : "eval";
    return "done";
  }
  function badge(t) { var s = status(t); return '<span class="st st-' + s + '">' + esc(L(T["s_" + s])) + "</span>"; }
  function supName(id) { return SUP[id] ? L(SUP[id].name) : id; }
  function supLink(id) { return '<a href="/supplier.html?id=' + encodeURIComponent(id) + '">' + esc(supName(id)) + "</a>"; }
  function tLink(t) { return '<a href="/tender.html?id=' + encodeURIComponent(t.id) + '">' + esc(t.id) + "</a>"; }
  function winner(t) { return t.bids.filter(function (b) { return b.win; })[0]; }

  function chrome() {
    document.documentElement.lang = { en: "en", ir: "ky-Latn", ru: "ru" }[LANG];
    var names = { ir: "Irad tili", ru: "Русский", en: "English" };
    var menu = [["/", T.m_home, "home"], ["/tenders.html", T.m_list, "list"], ["/suppliers.html", T.m_sup, "suppliers"], ["/blacklist.html", T.m_bl, "blacklist"], ["/rules.html", T.m_rules, "rules"]];
    var on = { tender: "list", supplier: "suppliers" }[PAGE] || PAGE;
    $("#top").innerHTML = '<div class="wrap"><div class="hd"><a class="emb" href="/"><img src="/assets/emblem.svg" alt=""></a><div><div class="t1">' + esc(L(T.t1)) + '</div><div class="t2">' + esc(L(T.t2)) + '</div></div><div class="r">' + LANGS.map(function (l) { return '<a href="?lang=' + l + '" data-l="' + l + '"' + (l === LANG ? ' class="on"' : "") + ">" + names[l] + "</a>"; }).join("") + '<br><a class="ei" href="https://e-irad.org/"><img src="/assets/eirad.svg" alt="">' + esc(L(T.eirad)) + '</a></div></div><div class="nav">' +
      menu.map(function (m) { return '<a href="' + m[0] + '"' + (m[2] === on ? ' class="on"' : "") + ">" + esc(L(m[1])) + "</a>"; }).join("") + '</div><div class="tick"><b>' + esc(L(T.tick)) + "</b><span>" + esc(L(T.tickT)) + '</span></div><div class="main" id="app">' + esc(L(T.loading)) + '</div><div class="ft">' + esc(L(T.foot)) + "</div></div>";
    $$("[data-l]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); LANG = a.getAttribute("data-l"); try { localStorage.setItem("eirad_lang", LANG); } catch (x) {} render(); }); });
  }

  /* ---------- tables ---------- */
  function tenderTable(list, cols) {
    var head = { no: T.c_no, title: T.c_title, ent: T.c_ent, meth: T.c_meth, est: T.c_est, pub: T.c_pub, dl: T.c_dl, st: T.c_st, win: T.c_win, amt: T.c_amt };
    var cell = {
      no: function (t) { return "<td>" + tLink(t) + "</td>"; },
      title: function (t) { return "<td>" + esc(L(t.title)) + "</td>"; },
      ent: function (t) { return '<td class="small">' + esc(L(D.entities[t.entity])) + "</td>"; },
      meth: function (t) { return '<td class="small">' + esc(L(D.methods[t.method])) + "</td>"; },
      est: function (t) { return '<td class="n">' + num(t.estimate) + "</td>"; },
      pub: function (t) { return '<td class="n">' + dmy(t.published) + "</td>"; },
      dl: function (t) { return '<td class="n">' + dmy(t.deadline) + "</td>"; },
      st: function (t) { return "<td>" + badge(t) + "</td>"; },
      win: function (t) { var w = winner(t); return "<td>" + (w && t.contract ? supLink(w.s) : "—") + "</td>"; },
      amt: function (t) { return '<td class="n">' + (t.contract ? num(t.contract.amount) : "—") + "</td>"; }
    };
    if (!list.length) return '<p class="muted">' + esc(L(T.none)) + "</p>";
    return '<div class="tw"><table class="t"><tr>' + cols.map(function (c) { return "<th" + (/est|pub|dl|amt/.test(c) ? ' class="n"' : "") + ">" + esc(L(head[c])) + (c === "est" || c === "amt" ? ", " + esc(L(T.som)) : "") + "</th>"; }).join("") + "</tr>" +
      list.map(function (t) { return "<tr>" + cols.map(function (c) { return cell[c](t); }).join("") + "</tr>"; }).join("") + "</table></div>";
  }
  function byDate(k) { return function (a, b) { return a[k] < b[k] ? 1 : a[k] > b[k] ? -1 : a.id < b.id ? 1 : -1; }; }

  /* ---------- home ---------- */
  var H = {
    h: { en: "Public procurement of the ISEZ", ir: "IAEZdin mamlekettik satıp aluuları", ru: "Государственные закупки ОЭЗИ" },
    intro: { en: "Every purchase of goods, works and services by a state body, city hall or state enterprise of the ISEZ above 100,000 som is announced here, together with the bids received and the contract signed. The register of suppliers and the list of unreliable suppliers are kept by the Department.", ir: "IAEZdin mamlekettik organdarının, meriyalarının je mamlekettik ishkanalarının 100 000 somdon jogoru ar bir tovar, jumush je kızmat satıp aluusu ushul jerde jariyalanat, alıngan arızdar jana tüzülgön kelishim menen birge. Jetkiruuchülör reestrin jana ishenimsiz jetkiruuchülördün tizmesin departament jürgüzöt.", ru: "Здесь объявляется каждая закупка товаров, работ и услуг государственными органами, мэриями и государственными предприятиями ОЭЗИ свыше 100 000 сом, вместе с поступившими заявками и заключённым договором. Реестр поставщиков и список недобросовестных поставщиков ведёт Департамент." },
    k1: { en: "procurements published in 2026", ir: "2026-jılı jariyalangan satıp aluular", ru: "закупок опубликовано в 2026 году" },
    k2: { en: "contracts signed in 2026", ir: "2026-jılı tüzülgön kelishimder", ru: "договоров заключено в 2026 году" },
    k3: { en: "total value of contracts, som", ir: "kelishimderdin jalpı summası, som", ru: "общая сумма договоров, сом" },
    k4: { en: "average bids per procurement", ir: "bir satıp aluuga ortocho arız", ru: "заявок в среднем на закупку" },
    openH: { en: "Accepting bids now", ir: "Azır arızdar kabıl alınuuda", ru: "Сейчас принимаются заявки" },
    evalH: { en: "Under evaluation", ir: "Baaloodo", ru: "На оценке" },
    lastH: { en: "Latest contracts", ir: "Akırkı kelishimder", ru: "Последние договоры" },
    more: { en: "All procurements »", ir: "Bardık satıp aluular »", ru: "Все закупки »" },
    upd: { en: "Register updated {d}.", ir: "Reestr {d} jañılandı.", ru: "Реестр обновлён {d}." }
  };
  function pageHome() {
    var t = D.tenders, y = t.filter(function (x) { return x.published >= "2026-01-01"; }), c = y.filter(function (x) { return x.contract; });
    var sum = c.reduce(function (a, x) { return a + x.contract.amount; }, 0), withBids = y.filter(function (x) { return !x.open; });
    var avg = withBids.reduce(function (a, x) { return a + x.bids.length; }, 0) / (withBids.length || 1);
    var open = t.filter(function (x) { return status(x) === "open"; }).sort(byDate("deadline")).reverse();
    var ev = t.filter(function (x) { return status(x) === "eval"; }).sort(byDate("deadline"));
    var last = t.filter(function (x) { return x.contract; }).sort(function (a, b) { return a.contract.date < b.contract.date ? 1 : -1; }).slice(0, 12);
    $("#app").innerHTML = "<h1>" + esc(L(H.h)) + "</h1><p>" + esc(L(H.intro)) + '</p><div class="stats"><div><b>' + y.length + "</b>" + esc(L(H.k1)) + "</div><div><b>" + c.length + "</b>" + esc(L(H.k2)) + "</div><div><b>" + num(sum) + "</b>" + esc(L(H.k3)) + "</div><div><b>" + avg.toFixed(1).replace(".", LANG === "en" ? "." : ",") + "</b>" + esc(L(H.k4)) + "</div></div>" +
      "<h2>" + esc(L(H.openH)) + " (" + open.length + ")</h2>" + tenderTable(open, ["no", "title", "ent", "est", "dl"]) +
      (ev.length ? "<h2>" + esc(L(H.evalH)) + " (" + ev.length + ")</h2>" + tenderTable(ev, ["no", "title", "ent", "est", "dl"]) : "") +
      "<h2>" + esc(L(H.lastH)) + "</h2>" + tenderTable(last, ["no", "title", "ent", "win", "amt"]) + '<p class="pg"><a href="/tenders.html">' + esc(L(H.more)) + '</a></p><p class="small muted">' + esc(L(H.upd, { d: dmy(D.updated) })) + "</p>";
  }

  /* ---------- list ---------- */
  var F = { h: { en: "Search procurements", ir: "Satıp aluulardı izdöö", ru: "Поиск закупок" } };
  function pageList() {
    var st = { q: q.get("q") || "", e: q.get("e") || "", m: q.get("m") || "", s: q.get("s") || "", p: 1 };
    var ents = Object.keys(D.entities).sort(function (a, b) { return L(D.entities[a]).localeCompare(L(D.entities[b])); });
    $("#app").innerHTML = "<h1>" + esc(L(F.h)) + '</h1><form class="filters" id="f"><div><label for="fq">' + esc(L(T.word)) + '</label><input id="fq" size="22" value="' + esc(st.q) + '"></div><div><label for="fe">' + esc(L(T.c_ent)) + '</label><select id="fe"><option value="">— ' + esc(L(T.all)) + " —</option>" + ents.map(function (k) { return '<option value="' + k + '">' + esc(L(D.entities[k])) + "</option>"; }).join("") + '</select></div><div><label for="fm">' + esc(L(T.c_meth)) + '</label><select id="fm"><option value="">— ' + esc(L(T.all)) + " —</option>" + Object.keys(D.methods).map(function (k) { return '<option value="' + k + '">' + esc(L(D.methods[k])) + "</option>"; }).join("") + '</select></div><div><label for="fs">' + esc(L(T.c_st)) + '</label><select id="fs"><option value="">— ' + esc(L(T.all)) + " —</option>" + ["open", "eval", "done", "fail", "canc"].map(function (k) { return '<option value="' + k + '">' + esc(L(T["s_" + k])) + "</option>"; }).join("") + '</select></div><div><button class="btn">' + esc(L(T.find)) + '</button></div></form><div id="res"></div>';
    $("#fe").value = st.e; $("#fm").value = st.m; $("#fs").value = st.s;
    function show() {
      var w = st.q.toLowerCase().trim();
      var list = D.tenders.filter(function (t) {
        return (!st.e || t.entity === st.e) && (!st.m || t.method === st.m) && (!st.s || status(t) === st.s) &&
          (!w || t.id.toLowerCase().indexOf(w) >= 0 || ["en", "ir", "ru"].some(function (l) { return t.title[l].toLowerCase().indexOf(w) >= 0; }));
      }).sort(byDate("published"));
      var per = 25, pages = Math.max(1, Math.ceil(list.length / per)); st.p = Math.min(st.p, pages);
      var pg = pages > 1 ? '<div class="pg">' + esc(L(T.page)) + ": " + Array.apply(null, Array(pages)).map(function (x, i) { return i + 1 === st.p ? "<b>" + (i + 1) + "</b>" : '<a href="#" data-p="' + (i + 1) + '">' + (i + 1) + "</a>"; }).join("") + "</div>" : "";
      $("#res").innerHTML = '<p class="small">' + esc(L(T.shown, { n: list.length })) + "</p>" + tenderTable(list.slice((st.p - 1) * per, st.p * per), ["no", "title", "ent", "meth", "est", "pub", "st"]) + pg;
      $$("[data-p]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); st.p = +a.getAttribute("data-p"); show(); window.scrollTo(0, 0); }); });
    }
    $("#f").addEventListener("submit", function (e) { e.preventDefault(); st.q = $("#fq").value; st.e = $("#fe").value; st.m = $("#fm").value; st.s = $("#fs").value; st.p = 1; show(); });
    show();
  }

  /* ---------- one tender ---------- */
  var V = {
    notFound: { en: "No procurement with this number. Numbers look like T-26-01217.", ir: "Mından nomerdegi satıp aluu jok. Nomerler T-26-01217 sıyaktuu bolot.", ru: "Закупка с таким номером не найдена. Номера имеют вид T-26-01217." },
    bidsH: { en: "Bids received and evaluation", ir: "Alıngan arızdar jana baaloo", ru: "Поступившие заявки и оценка" },
    noBids: { en: "No bids were received.", ir: "Bir da arız tüshkön jok.", ru: "Заявок не поступило." },
    sealed: { en: "Bids are opened in public at the procuring entity on the day after the deadline. Their contents are published here after evaluation.", ir: "Arızdar möönöttön kiyinki künü buyurtmachıda achık achılat. Alardın mazmunu baaloodon kiyin ushul jerde jariyalanat.", ru: "Конверты вскрываются публично у заказчика на следующий день после окончания срока. Содержание заявок публикуется здесь после оценки." },
    evalN: { en: "The bid deadline has passed. Bids are being evaluated by the procuring entity's tender committee (Act, art. 28: up to 20 working days).", ir: "Arız berüü möönötü ötüp ketti. Arızdardı buyurtmachının konkurs komissiyası baalap jatat (Akt, 28-berene: 20 jumush künügö cheyin).", ru: "Срок подачи заявок истёк. Заявки оценивает конкурсная комиссия заказчика (Закон, ст. 28: до 20 рабочих дней)." },
    docs: { en: "Tender documents", ir: "Konkurstuk dokumentter", ru: "Конкурсная документация" },
    docsV: { en: "Issued free of charge at the procuring entity on presentation of a letter from the supplier.", ir: "Jetkiruuchünün katın körsötköndö buyurtmachıda akısız berilet.", ru: "Выдаётся бесплатно у заказчика по письму поставщика." },
    won: { en: "Winner", ir: "Jeñüüchü", ru: "Победитель" },
    lost: { en: "Not selected", ir: "Tandalgan jok", ru: "Не выбран" },
    cH: { en: "Contract", ir: "Kelishim", ru: "Договор" },
    cNo: { en: "Contract No.", ir: "Kelishimdin №", ru: "№ договора" },
    reason: { en: "Grounds for single-source procurement", ir: "Bir bulaktan satıp aluunun negizi", ru: "Основание закупки из одного источника" },
    failN: { en: "The procurement did not take place: no bid met the requirements (Act, art. 31). It may be announced again.", ir: "Satıp aluu bolgon jok: bir da arız talaptarga joop bergen jok (Akt, 31-berene). Kayra jariyalanıshı mümkün.", ru: "Закупка не состоялась: ни одна заявка не соответствовала требованиям (Закон, ст. 31). Может быть объявлена повторно." },
    cancH: { en: "Cancelled on {d}", ir: "{d} jokko chıgarıldı", ru: "Отменена {d}" },
    back: { en: "« Back to the list", ir: "« Tizmege kaytuu", ru: "« Вернуться к списку" },
    other: { en: "Other procurements of this entity", ir: "Bul buyurtmachının bashka satıp aluuları", ru: "Другие закупки этого заказчика" }
  };
  function pageTender() {
    var id = (q.get("id") || "").toUpperCase().trim(), t = D.tenders.filter(function (x) { return x.id === id; })[0];
    if (!t) { $("#app").innerHTML = "<h1>" + esc(L(T.m_list)) + '</h1><div class="note">' + esc(L(V.notFound)) + '</div><p><a href="/tenders.html">' + esc(L(V.back)) + "</a></p>"; return; }
    var s = status(t), w = winner(t);
    var kv = [[T.c_no, esc(t.id)], [T.c_title, "<b>" + esc(L(t.title)) + "</b>"], [T.c_ent, '<a href="/tenders.html?e=' + t.entity + '">' + esc(L(D.entities[t.entity])) + "</a>"], [T.c_meth, esc(L(D.methods[t.method]))], [T.c_est, som(t.estimate)], [T.c_pub, dmy(t.published)], [T.c_dl, dmy(t.deadline) + ", 10:00"], [T.c_st, badge(t)]];
    if (t.reason) kv.push([V.reason, esc(L(t.reason))]);
    if (s === "open") kv.push([V.docs, esc(L(V.docsV))]);
    var h = "<h1>" + esc(t.id) + ": " + esc(L(t.title)) + '</h1><dl class="kv">' + kv.map(function (r) { return "<dt>" + esc(L(r[0])) + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>";
    h += "<h2>" + esc(L(V.bidsH)) + "</h2>";
    if (s === "open") h += '<div class="note">' + esc(L(V.sealed)) + "</div>";
    else if (s === "eval") h += '<div class="note">' + esc(L(V.evalN)) + "</div>";
    else if (!t.bids.length) h += '<p class="muted">' + esc(L(V.noBids)) + "</p>";
    else {
      var bids = t.bids.slice().sort(function (a, b) { return a.price - b.price; });
      h += '<div class="tw"><table class="t"><tr><th>' + esc(L(T.c_sup)) + '</th><th class="n">' + esc(L(T.c_price)) + ", " + esc(L(T.som)) + '</th><th class="n">' + esc(L(T.c_pct)) + "</th><th>" + esc(L(T.c_res)) + "</th></tr>" + bids.map(function (b) {
        return "<tr" + (b.win && t.contract ? ' class="win"' : "") + "><td>" + supLink(b.s) + '</td><td class="n">' + num(b.price) + '</td><td class="n">' + (b.price / t.estimate * 100).toFixed(1) + "</td><td>" + (b.win && t.contract ? esc(L(V.won)) : b.rej ? esc(L(b.rej)) : esc(L(V.lost))) + "</td></tr>";
      }).join("") + "</table></div>";
    }
    if (t.contract) h += "<h2>" + esc(L(V.cH)) + '</h2><dl class="kv"><dt>' + esc(L(V.cNo)) + "</dt><dd>" + esc(t.contract.no) + "</dd><dt>" + esc(L(T.c_date)) + "</dt><dd>" + dmy(t.contract.date) + "</dd><dt>" + esc(L(T.c_sup)) + "</dt><dd>" + (w ? supLink(w.s) : "—") + "</dd><dt>" + esc(L(T.c_amt)) + "</dt><dd>" + som(t.contract.amount) + "</dd></dl>";
    if (s === "fail") h += '<div class="note">' + esc(L(V.failN)) + "</div>";
    if (t.cancelled) h += '<div class="note"><b>' + esc(L(V.cancH, { d: dmy(t.cancelled.date) })) + "</b>. " + esc(L(t.cancelled.reason)) + "</div>";
    var other = D.tenders.filter(function (x) { return x.entity === t.entity && x.id !== t.id; }).sort(byDate("published")).slice(0, 8);
    if (other.length) h += "<h2>" + esc(L(V.other)) + "</h2>" + tenderTable(other, ["no", "title", "pub", "st"]);
    h += '<p class="pg"><a href="/tenders.html">' + esc(L(V.back)) + "</a></p>";
    $("#app").innerHTML = h;
    document.title = t.id + " | tender.e-irad.org";
  }

  /* ---------- suppliers ---------- */
  var R = {
    h: { en: "Register of suppliers", ir: "Jetkiruuchülör reestri", ru: "Реестр поставщиков" },
    intro: { en: "Suppliers that have taken part in public procurement since November 2025. Registration in the register is made on a supplier's first bid; details are as given in the bid.", ir: "2025-jıldın noyabrınan beri mamlekettik satıp aluularga katıshkan jetkiruuchülör. Reestrge jetkiruuchünün birinchi arızı boyuncha kattalat; maalımattar arızdagıday.", ru: "Поставщики, участвовавшие в государственных закупках с ноября 2025 года. Запись в реестр вносится по первой заявке поставщика; сведения указаны так, как в заявке." },
    word: { en: "Name, address or director", ir: "Atı, dareki je direktoru", ru: "Название, адрес или руководитель" },
    nf: { en: "No supplier with this code in the register.", ir: "Reestrde mından koddogu jetkiruuchü jok.", ru: "Поставщик с таким кодом в реестре не найден." },
    hist: { en: "Participation in procurements", ir: "Satıp aluularga katıshuu", ru: "Участие в закупках" }
  };
  function stats(id) {
    var bids = 0, wins = 0, tot = 0;
    D.tenders.forEach(function (t) { t.bids.forEach(function (b) { if (b.s === id) { bids++; if (b.win && t.contract) { wins++; tot += t.contract.amount; } } }); });
    return { bids: bids, wins: wins, tot: tot };
  }
  function pageSuppliers() {
    $("#app").innerHTML = "<h1>" + esc(L(R.h)) + "</h1><p>" + esc(L(R.intro)) + '</p><form class="filters" id="f"><div><label for="fq">' + esc(L(R.word)) + '</label><input id="fq" size="28" value="' + esc(q.get("q") || "") + '"></div><div><button class="btn">' + esc(L(T.find)) + '</button></div></form><div id="res"></div>';
    function show() {
      var w = $("#fq").value.toLowerCase().trim();
      var list = S.suppliers.filter(function (s) { return !w || [s.director].concat(["en", "ir", "ru"].map(function (l) { return s.name[l] + " " + s.address[l]; })).join(" ").toLowerCase().indexOf(w) >= 0; })
        .sort(function (a, b) { return L(a.name).localeCompare(L(b.name)); });
      $("#res").innerHTML = '<p class="small">' + esc(L(T.shown, { n: list.length })) + "</p>" + (list.length ? '<div class="tw"><table class="t"><tr><th>' + esc(L(T.c_sup)) + "</th><th>" + esc(L(T.c_addr)) + "</th><th>" + esc(L(T.c_dir)) + '</th><th class="n">' + esc(L(T.c_reg)) + '</th><th class="n">' + esc(L(T.c_bids)) + '</th><th class="n">' + esc(L(T.c_wins)) + "</th></tr>" + list.map(function (s) {
        var x = stats(s.id); return "<tr><td>" + supLink(s.id) + '</td><td class="small">' + esc(L(s.address)) + '</td><td class="small">' + esc(s.director) + '</td><td class="n">' + dmy(s.reg) + '</td><td class="n">' + x.bids + '</td><td class="n">' + x.wins + "</td></tr>";
      }).join("") + "</table></div>" : '<p class="muted">' + esc(L(T.none)) + "</p>");
    }
    $("#f").addEventListener("submit", function (e) { e.preventDefault(); show(); });
    show();
  }
  function pageSupplier() {
    var s = SUP[q.get("id") || ""];
    if (!s) { $("#app").innerHTML = "<h1>" + esc(L(R.h)) + '</h1><div class="note">' + esc(L(R.nf)) + '</div><p><a href="/suppliers.html">' + esc(L(V.back)) + "</a></p>"; return; }
    var x = stats(s.id), mine = D.tenders.filter(function (t) { return t.bids.some(function (b) { return b.s === s.id; }); }).sort(byDate("published"));
    $("#app").innerHTML = "<h1>" + esc(L(s.name)) + '</h1><dl class="kv"><dt>' + esc(L(T.c_addr)) + "</dt><dd>" + esc(L(s.address)) + "</dd><dt>" + esc(L(T.c_dir)) + "</dt><dd>" + esc(s.director) + "</dd><dt>" + esc(L(T.c_reg)) + "</dt><dd>" + dmy(s.reg) + "</dd><dt>" + esc(L(T.c_bids)) + "</dt><dd>" + x.bids + "</dd><dt>" + esc(L(T.c_wins)) + "</dt><dd>" + x.wins + "</dd><dt>" + esc(L(T.c_tot)) + "</dt><dd>" + som(x.tot) + "</dd></dl><h2>" + esc(L(R.hist)) + "</h2>" +
      '<div class="tw"><table class="t"><tr><th>' + esc(L(T.c_no)) + "</th><th>" + esc(L(T.c_title)) + "</th><th>" + esc(L(T.c_ent)) + '</th><th class="n">' + esc(L(T.c_price)) + ", " + esc(L(T.som)) + "</th><th>" + esc(L(T.c_res)) + "</th></tr>" + mine.map(function (t) {
        var b = t.bids.filter(function (y) { return y.s === s.id; })[0];
        return "<tr><td>" + tLink(t) + "</td><td>" + esc(L(t.title)) + '</td><td class="small">' + esc(L(D.entities[t.entity])) + '</td><td class="n">' + num(b.price) + "</td><td>" + (b.win && t.contract ? "<b>" + esc(L(V.won)) + "</b>" : b.rej ? esc(L(b.rej)) : t.cancelled ? esc(L(T.s_canc)) : esc(L(V.lost))) + "</td></tr>";
      }).join("") + '</table></div><p class="pg"><a href="/suppliers.html">' + esc(L(V.back)) + "</a></p>";
    document.title = L(s.name) + " | tender.e-irad.org";
  }

  /* ---------- unreliable suppliers ---------- */
  var B = {
    intro: { en: "Suppliers that failed to perform a public contract, gave false information in a bid or refused to sign a contract they had won are barred from public procurement for two years (Act, art. 43). Bids from listed suppliers, their directors and founders are rejected.", ir: "Mamlekettik kelishimdi atkarbagan, arızda jalgan maalımat bergen je utkan kelishimge kol koyuudan bash tartkan jetkiruuchülör eki jılga mamlekettik satıp aluulardan chetteletilet (Akt, 43-berene). Tizmedegi jetkiruuchülördün, alardın direktorlorunun jana negizdöödüchülörünün arızdarı kabıl alınbayt.", ru: "Поставщики, не исполнившие государственный договор, представившие в заявке ложные сведения или отказавшиеся подписать выигранный договор, отстраняются от государственных закупок на два года (Закон, ст. 43). Заявки поставщиков из списка, их руководителей и учредителей отклоняются." }
  };
  function pageBlacklist() {
    $("#app").innerHTML = "<h1>" + esc(L(T.m_bl)) + "</h1><p>" + esc(L(B.intro)) + '</p><div class="tw"><table class="t"><tr><th>' + esc(L(T.c_sup)) + "</th><th>" + esc(L(T.c_addr)) + "</th><th>" + esc(L(T.c_dir)) + '</th><th class="n">' + esc(L(T.c_from)) + '</th><th class="n">' + esc(L(T.c_to)) + "</th><th>" + esc(L(T.c_why)) + "</th></tr>" + S.unreliable.map(function (u) {
      return "<tr><td>" + esc(L(u.name)) + '</td><td class="small">' + esc(L(u.address)) + '</td><td class="small">' + esc(u.director) + '</td><td class="n">' + dmy(u.from) + '</td><td class="n">' + dmy(u.to) + '</td><td class="small">' + esc(L(u.reason)) + "</td></tr>";
    }).join("") + "</table></div>";
  }

  /* ---------- rules ---------- */
  var RU = {
    rows: [
      [{ en: "Law", ir: "Mıyzam", ru: "Закон" }, { en: "Public Procurement Act 2015 of the ISEZ, as amended in 2021; Regulations on the State Procurement Portal (Order of the Ministry of Economy No. 112, 2016).", ir: "IAEZdin 2015-jılkı Mamlekettik satıp aluular jönündö aktı, 2021-jılkı özgörtüülör menen; Mamlekettik satıp aluular portalı jönündö jobo (Ekonomika ministrliginin №112 buyrugu, 2016).", ru: "Закон ОЭЗИ о государственных закупках 2015 года с изменениями 2021 года; Положение о Портале государственных закупок (приказ Министерства экономики № 112, 2016)." }],
      [{ en: "Open tender", ir: "Achık konkurs", ru: "Открытый конкурс" }, { en: "The standard method. Notice at least 30 days before the deadline (15 days below 1,000,000 som). Lowest evaluated price wins.", ir: "Negizgi ıkma. Bildirüü möönöttön keminde 30 kün murun (1 000 000 somdon tömön bolso 15 kün). Eñ tömön baalangan baa utat.", ru: "Основной метод. Объявление не менее чем за 30 дней до срока (15 дней при сумме до 1 000 000 сом). Побеждает наименьшая оценённая цена." }],
      [{ en: "Request for quotations", ir: "Baa sunushtarın suroo", ru: "Запрос котировок" }, { en: "Standard goods and services up to 2,500,000 som. At least 10 days; at least three quotations are sought.", ir: "2 500 000 somgo cheyinki standarttık tovarlar jana kızmattar. Keminde 10 kün; keminde üch baa sunushu suralat.", ru: "Стандартные товары и услуги до 2 500 000 сом. Не менее 10 дней; запрашивается не менее трёх котировок." }],
      [{ en: "Two-stage tender", ir: "Eki baskıchtuu konkurs", ru: "Двухэтапный конкурс" }, { en: "Complex works and systems: technical proposals first, then prices from the qualified suppliers.", ir: "Tataal jumushtar jana sistemalar: adegende tehnikalık sunushtar, andan kiyin talapka joop bergen jetkiruuchülördün baaları.", ru: "Сложные работы и системы: сначала технические предложения, затем цены от прошедших отбор поставщиков." }],
      [{ en: "Single source", ir: "Bir bulaktan", ru: "Из одного источника" }, { en: "Only on the grounds of art. 21(1): (a) one supplier in the ISEZ; (b) urgent need after an emergency; (c) additional works under an existing contract up to 20%; (d) state security; (e) natural monopolies. The grounds are published with the contract.", ir: "21(1)-berenin negizderi boyuncha gana: (a) IAEZde bir jetkiruuchü; (b) kırsıktan kiyinki shashılısh muktajdık; (c) bar kelishim boyuncha 20%ga cheyin koshumcha jumushtar; (d) mamlekettik koopsuzduk; (e) tabiyiy monopoliyalar. Negizi kelishim menen kosho jariyalanat.", ru: "Только по основаниям ст. 21(1): (а) единственный поставщик в ОЭЗИ; (б) срочная потребность после чрезвычайной ситуации; (в) дополнительные работы по действующему договору до 20%; (г) государственная безопасность; (д) естественные монополии. Основание публикуется вместе с договором." }],
      [{ en: "Language", ir: "Til", ru: "Язык" }, { en: "Bids are submitted in the state language. Documents in another language must come with a certified translation (Act, art. 17(4)).", ir: "Arızdar mamlekettik tilde berilet. Bashka tildegi dokumentterge kubolondurulgan kotormo tirkelet (Akt, 17(4)-berene).", ru: "Заявки подаются на государственном языке. К документам на другом языке прилагается заверенный перевод (Закон, ст. 17(4))." }],
      [{ en: "Bid security", ir: "Arızdın kamsızdoosu", ru: "Обеспечение заявки" }, { en: "1% of the estimate for open and two-stage tenders, by bank guarantee or deposit to the procuring entity's account at Talasbank.", ir: "Achık jana eki baskıchtuu konkurstar üchün smetanın 1%ı, bank kepildigi je buyurtmachının Talasbanktagı esebine depozit menen.", ru: "1% сметной стоимости для открытых и двухэтапных конкурсов, банковской гарантией или депозитом на счёт заказчика в «Таласбанке»." }],
      [{ en: "Complaints", ir: "Daattanuular", ru: "Жалобы" }, { en: "Within 5 working days of the result, in writing to the Department's Complaints Commission, Government House, Talas. A complaint suspends the signing of the contract.", ir: "Natıyja chıkkandan kiyin 5 jumush kün ichinde, departamenttin Daattanuular komissiyasına jazuu türündö, Ökmöt üyü, Talas. Daattanuu kelishimge kol koyuunu toktotot.", ru: "В течение 5 рабочих дней после объявления результата, письменно в Комиссию по жалобам Департамента, Дом Правительства, Талас. Жалоба приостанавливает подписание договора." }]
    ],
    h: { en: "Rules of public procurement", ir: "Mamlekettik satıp aluulardın erejeleri", ru: "Правила государственных закупок" }
  };
  function pageRules() {
    $("#app").innerHTML = "<h1>" + esc(L(RU.h)) + '</h1><dl class="kv">' + RU.rows.map(function (r) { return "<dt>" + esc(L(r[0])) + "</dt><dd>" + esc(L(r[1])) + "</dd>"; }).join("") + "</dl>";
  }

  function render() {
    chrome();
    if (PAGE === "rules") return pageRules();
    if (!D) { if (D === false) $("#app").innerHTML = '<div class="note">' + esc(L(T.nodata)) + "</div>"; return; }
    ({ home: pageHome, list: pageList, tender: pageTender, suppliers: pageSuppliers, supplier: pageSupplier, blacklist: pageBlacklist, rules: pageRules }[PAGE] || pageHome)();
  }
  render();
  Promise.all(["/data/tenders.json", "/data/suppliers.json"].map(function (u) { return fetch(u).then(function (r) { if (!r.ok) throw r.status; return r.json(); }); }))
    .then(function (r) { D = r[0]; S = r[1]; S.suppliers.forEach(function (s) { SUP[s.id] = s; }); render(); })
    .catch(function () { D = false; render(); });
})();
