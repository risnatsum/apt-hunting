"""Download listing photos/floor plans into the repo and collect floor plan
candidates from image search. Runs in GitHub Actions (see .github/workflows).

- For every apartment in apartments.js, any http(s) photo or floorPlan URL is
  downloaded to apartments/<id>/ (the original URL list is kept in sources.json).
- tools/searches.json lists image-search queries per apartment; the top hits
  are saved to candidates/<id>/ so a floor plan can be picked by eye.
"""
import hashlib, html, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def get(url, referer=None, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en,zh-HK;q=0.8", **({"Referer": referer} if referer else {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get("Content-Type", "")


def ext_for(url, ctype):
    for e in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if e in url.lower():
            return ".jpg" if e == ".jpeg" else e
    return {"image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}.get(ctype.split(";")[0], ".jpg")


def load_apartments():
    src = open(os.path.join(ROOT, "apartments.js"), encoding="utf8").read()
    out = []
    for block in re.findall(r"\{\s*id:\s*\"([^\"]+)\"(.*?)\n  \}", src, re.S):
        apt_id, body = block
        photos = re.search(r"photos:\s*\[(.*?)\]", body, re.S)
        plan = re.search(r"floorPlan:\s*\"([^\"]*)\"", body)
        url = re.search(r"\burl:\s*\"([^\"]*)\"", body)
        out.append({
            "id": apt_id,
            "photos": re.findall(r"\"([^\"]+)\"", photos.group(1)) if photos else [],
            "floorPlan": plan.group(1) if plan else "",
            "url": url.group(1) if url else "",
        })
    return out


def download_listing_assets(apts):
    js_path = os.path.join(ROOT, "apartments.js")
    js = open(js_path, encoding="utf8").read()
    for a in apts:
        d = os.path.join(ROOT, "apartments", a["id"])
        os.makedirs(d, exist_ok=True)
        sources_path = os.path.join(d, "sources.json")
        sources = json.load(open(sources_path)) if os.path.exists(sources_path) else {}
        items = [(u, f"photo-{i + 1:02d}") for i, u in enumerate(a["photos"])]
        if a["floorPlan"]:
            items.append((a["floorPlan"], "floorplan"))
        for url, name in items:
            if not url.startswith("http"):
                continue
            try:
                data, ctype = get(url, referer=a["url"] or None)
                if len(data) < 2000:
                    raise ValueError(f"suspiciously small ({len(data)} bytes)")
                rel = f"apartments/{a['id']}/{name}{ext_for(url, ctype)}"
                open(os.path.join(ROOT, rel), "wb").write(data)
                sources[rel] = url
                js = js.replace(f'"{url}"', f'"{rel}"')
                print("saved", rel)
            except Exception as e:  # keep the remote URL if the download fails
                print("FAILED", url, e, file=sys.stderr)
        json.dump(sources, open(sources_path, "w"), indent=2)
    open(js_path, "w", encoding="utf8").write(js)


def bing_images(q, n):
    page, _ = get("https://www.bing.com/images/search?form=HDRSC2&first=1&q=" + urllib.parse.quote(q))
    text = html.unescape(page.decode("utf8", "ignore"))
    hits = []
    for m in re.finditer(r'"murl":"(.*?)".*?"purl":"(.*?)"', text):
        hits.append({"image": m.group(1), "page": m.group(2), "engine": "bing"})
    return hits[:n]


def google_images(q, n):
    page, _ = get("https://www.google.com/search?tbm=isch&hl=en&q=" + urllib.parse.quote(q))
    text = page.decode("utf8", "ignore")
    urls = re.findall(r'\["(https?://[^"]+?\.(?:jpg|jpeg|png|webp))",\d+,\d+\]', text)
    seen, hits = set(), []
    for u in urls:
        u = u.encode().decode("unicode_escape")
        if "gstatic.com" in u or u in seen:
            continue
        seen.add(u)
        hits.append({"image": u, "page": "", "engine": "google"})
    return hits[:n]


def search_candidates():
    cfg_path = os.path.join(ROOT, "tools", "searches.json")
    if not os.path.exists(cfg_path):
        return
    cfg = json.load(open(cfg_path, encoding="utf8"))
    for apt_id, queries in cfg.items():
        d = os.path.join(ROOT, "candidates", apt_id)
        os.makedirs(d, exist_ok=True)
        index_path = os.path.join(d, "index.json")
        index = json.load(open(index_path)) if os.path.exists(index_path) else []
        have = {c["image"] for c in index}
        for q in queries:
            for engine in (google_images, bing_images):
                try:
                    hits = engine(q, 8)
                except Exception as e:
                    print("search failed", engine.__name__, q, e, file=sys.stderr)
                    continue
                for h in hits:
                    if h["image"] in have:
                        continue
                    have.add(h["image"])
                    try:
                        data, ctype = get(h["image"], referer=h["page"] or None, timeout=20)
                        if len(data) < 5000:
                            continue
                        name = hashlib.sha1(h["image"].encode()).hexdigest()[:10] + ext_for(h["image"], ctype)
                        open(os.path.join(d, name), "wb").write(data)
                        index.append({**h, "query": q, "file": name})
                        print("candidate", apt_id, name, h["image"])
                    except Exception as e:
                        print("candidate failed", h["image"], e, file=sys.stderr)
                time.sleep(1.5)
        json.dump(index, open(index_path, "w"), indent=2, ensure_ascii=False)


def fetch_pages():
    """Save raw HTML of listing pages so they can be read without network access."""
    cfg_path = os.path.join(ROOT, "tools", "pages.json")
    if not os.path.exists(cfg_path):
        return
    for name, url in json.load(open(cfg_path)).items():
        try:
            data, _ = get(url)
            os.makedirs(os.path.join(ROOT, "candidates", "pages"), exist_ok=True)
            open(os.path.join(ROOT, "candidates", "pages", name + ".html"), "wb").write(data)
            print("page", name)
        except Exception as e:
            print("page failed", url, e, file=sys.stderr)


def crawl():
    """tools/crawl.json: [{name, url, follow (regex), img (regex)}]. Saves the start page,
    pages it links to whose URL matches `follow`, and every image matching `img`
    found on them into candidates/<name>/."""
    cfg_path = os.path.join(ROOT, "tools", "crawl.json")
    if not os.path.exists(cfg_path):
        return
    for job in json.load(open(cfg_path, encoding="utf8")):
        d = os.path.join(ROOT, "candidates", job["name"])
        os.makedirs(d, exist_ok=True)
        index_path = os.path.join(d, "index.json")
        index = json.load(open(index_path)) if os.path.exists(index_path) else []
        have = {c["image"] for c in index}
        queue, seen = [job["url"]], set()
        while queue and len(seen) < job.get("maxPages", 12):
            url = queue.pop(0)
            if url in seen:
                continue
            seen.add(url)
            try:
                page, _ = get(url)
            except Exception as e:
                print("crawl failed", url, e, file=sys.stderr)
                continue
            text = page.decode("utf8", "ignore")
            slug = re.sub(r"[^a-z0-9]+", "-", url.lower())[-80:]
            open(os.path.join(d, "page-" + slug + ".html"), "w", encoding="utf8").write(text)
            print("crawled", url)
            links = {urllib.parse.urljoin(url, html.unescape(h)) for h in re.findall(r'href="([^"#]+)"', text)}
            if url == job["url"]:
                queue += sorted(l for l in links if re.search(job.get("follow", "$^"), l, re.I))
            imgs = {urllib.parse.urljoin(url, html.unescape(u)) for u in re.findall(r'(?:src|href|data-src|data-original)="([^"]+?\.(?:jpe?g|png|gif|webp)[^"]*)"', text, re.I)}
            imgs |= set(re.findall(r'https?://[^"\'\s<>]+?\.(?:jpe?g|png|gif|webp)', text, re.I))
            for im in sorted(imgs):
                if im in have or not re.search(job.get("img", "."), im, re.I):
                    continue
                have.add(im)
                try:
                    data, ctype = get(im, referer=url, timeout=20)
                    if len(data) < 8000:
                        continue
                    name = hashlib.sha1(im.encode()).hexdigest()[:10] + ext_for(im, ctype)
                    open(os.path.join(d, name), "wb").write(data)
                    index.append({"image": im, "page": url, "file": name})
                    print("image", job["name"], name, im)
                except Exception as e:
                    print("image failed", im, e, file=sys.stderr)
        json.dump(index, open(index_path, "w"), indent=2, ensure_ascii=False)


if __name__ == "__main__":
    download_listing_assets(load_apartments())
    search_candidates()
    fetch_pages()
    crawl()
