#!/usr/bin/env python3
"""Marchio Costi Lavoro Italia, tema carta e terracotta, in SVG vettoriale.

Genera in public/brand/:
  - simbolo.svg    la «C» fatta di righe di prospetto (prima riga senape, le altre terracotta)
  - marchio.svg    simbolo + «Costi Lavoro» (Newsreader 600, inchiostro) + «Italia» (Hanken Grotesk 600, terracotta)
  - icona.svg      favicon: simbolo chiaro su quadrato terracotta (uguale a app/icon.svg)
  - anteprima.svg  immagine social 1200x630 su fondo carta, con marchio e titolo

I testi sono convertiti in tracciati: gli SVG non dipendono da font caricati.
Requisiti: python3 con fonttools e uharfbuzz (es. `python3 -m venv .venv && .venv/bin/pip install fonttools uharfbuzz`).
Font (TTF variabili di Google Fonts, https://github.com/google/fonts, cartelle ofl/newsreader e ofl/hankengrotesk):
percorsi in NEWS / NEWS_IT / HANKEN qui sotto, oppure variabili d'ambiente MARCHIO_NEWS, MARCHIO_NEWS_IT, MARCHIO_HANKEN.
Uso: python3 scripts/marchio-svg.py public/brand && cp public/brand/icona.svg app/icon.svg
"""
import os
import sys

import uharfbuzz as hb
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

GF = "/usr/share/fonts/truetype/sand-box/google"
NEWS = os.environ.get("MARCHIO_NEWS", f"{GF}/Newsreader/Newsreader-VariableFont_opsz,wght.ttf")
NEWS_IT = os.environ.get("MARCHIO_NEWS_IT", f"{GF}/Newsreader/Newsreader-Italic-VariableFont_opsz,wght.ttf")
HANKEN = os.environ.get("MARCHIO_HANKEN", f"{GF}/Hanken Grotesk/HankenGrotesk-VariableFont_wght.ttf")

CARTA = "#F6F0E6"
CARTA_CHIARA = "#FBF7F0"
BEIGE = "#EDE3D3"
INCHIOSTRO = "#2B2420"
INCHIOSTRO_SOFT = "#5A4E45"
TERRACOTTA = "#B4432A"
TERRACOTTA_SCURA = "#93351F"
SENAPE = "#E2A23B"
SENAPE_CHIARA = "#F2C26B"
EVIDENZIATORE = "#F7DDA4"
SALVIA = "#4F6E4B"


def num(v):
    return ("%.2f" % v).rstrip("0").rstrip(".")


_fonts = {}


def hb_font(path, variations):
    key = (path, tuple(sorted(variations.items())))
    if key not in _fonts:
        blob = hb.Blob.from_file_path(path)
        face = hb.Face(blob)
        font = hb.Font(face)
        font.set_variations(variations)
        _fonts[key] = (font, face.upem)
    return _fonts[key]


def testo(path, variations, size, text, x, y, fill, tracking=0.0):
    """Restituisce (path SVG, larghezza) del testo con base sulla linea y, partendo da x."""
    font, upem = hb_font(path, variations)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    s = size / upem
    pen = SVGPathPen(None, ntos=num)
    cx = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        rec = RecordingPen()
        font.draw_glyph_with_pen(info.codepoint, rec)
        tp = TransformPen(pen, (s, 0, 0, -s, x + (cx + pos.x_offset) * s, y - pos.y_offset * s))
        rec.replay(tp)
        cx += pos.x_advance + tracking * upem
    larghezza = (cx - (tracking * upem if text else 0)) * s
    return f'<path fill="{fill}" d="{pen.getCommands()}"/>', larghezza


def misura(path, variations, size, text, tracking=0.0):
    return testo(path, variations, size, text, 0, 0, "#000", tracking)[1]


def simbolo(ox, oy, k, prima=SENAPE, altre=TERRACOTTA):
    """Simbolo nel sistema 48x48 dello schizzo, scalato di k e spostato in (ox, oy)."""
    righe = [(6, 34, prima), (14.5, 13, altre), (23, 13, altre), (31.5, 13, altre), (40, 34, altre)]
    out = []
    for y, w, c in righe:
        out.append(
            f'<rect x="{num(ox + 7 * k)}" y="{num(oy + y * k)}" width="{num(w * k)}" height="{num(5.5 * k)}" '
            f'rx="{num(2.75 * k)}" fill="{c}"/>'
        )
    return "".join(out)


# Proporzioni del marchio orizzontale, misurate sullo schizzo approvato (logo-horizontal.png):
# simbolo alto 132 (box 48 -> k=2.75), «Costi Lavoro» 81 px, «Italia» 39 px, spazio 30 px.
K = 2.75
NOME_SIZE = 81
ITALIA_SIZE = 39


def marchio_parti(ox, oy, scala=1.0, nome=INCHIOSTRO, italia=TERRACOTTA):
    k = K * scala
    parti = [simbolo(ox - 7 * k, oy - 6 * k, k)]  # il rettangolo visibile parte da (ox, oy)
    tx = ox + 34 * k + 30 * scala + 12 * scala
    base_nome = oy + 0.40 * 39.5 * k + 6 * scala
    p, w1 = testo(NEWS, {"wght": 600, "opsz": 72}, NOME_SIZE * scala, "Costi Lavoro", tx, base_nome, nome, -0.01)
    parti.append(p)
    base_italia = oy + 39.5 * k
    p, w2 = testo(HANKEN, {"wght": 600}, ITALIA_SIZE * scala, "Italia", tx + 2 * scala, base_italia, italia, 0.04)
    parti.append(p)
    larghezza = tx + max(w1, w2) - ox
    cima = base_nome - 0.72 * NOME_SIZE * scala  # ascendente di «C» e «L»
    return "".join(parti), larghezza, cima


def marchio_svg():
    corpo, w, cima = marchio_parti(0, 0)
    top = min(0, cima) - 2
    h = 39.5 * K - top + 2
    vw = w + 2
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {num(top)} {num(vw)} {num(h)}" '
        f'width="{num(vw)}" height="{num(h)}">\n{corpo}\n</svg>\n'
    ), vw / h


def simbolo_svg():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">\n'
        + simbolo(0, 0, 1)
        + "\n</svg>\n"
    )


def icona_svg():
    righe = [(11, 36, SENAPE_CHIARA), (20.5, 14, CARTA), (30, 14, CARTA), (39.5, 14, CARTA), (49, 36, CARTA)]
    rects = "".join(f'<rect x="14" y="{num(y)}" width="{w}" height="6" rx="3" fill="{c}"/>' for y, w, c in righe)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">\n'
        f'<rect width="64" height="64" rx="14" fill="{TERRACOTTA}"/>{rects}\n</svg>\n'
    )


def anteprima_svg():
    W, H = 1200, 630
    out = [f'<rect width="{W}" height="{H}" fill="{CARTA}"/>']
    corpo, _, _ = marchio_parti(80, 74, scala=0.5)
    out.append(corpo)
    # titolo
    size = 84
    news = {"wght": 500, "opsz": 72}
    news_it = {"wght": 500, "opsz": 72}
    x0 = 76
    p, _ = testo(NEWS, news, size, "Lo stipendio è", x0, 262, INCHIOSTRO, -0.025)
    out.append(p)
    p, _ = testo(NEWS, news, size, "solo la", x0, 346, INCHIOSTRO, -0.025)
    out.append(p)
    p, w = testo(NEWS_IT, news_it, size, "prima riga.", x0, 430, TERRACOTTA, -0.02)
    out.append(
        f'<path d="M{num(x0 - 4)} 452 C {num(x0 + w * 0.23)} 441, {num(x0 + w * 0.5)} 442, {num(x0 + w + 6)} 446" '
        f'stroke="{SENAPE}" stroke-width="7" fill="none" stroke-linecap="round"/>'
    )
    out.append(p)
    p, _ = testo(HANKEN, {"wght": 500}, 26, "Simulatore del costo del lavoro, stima gratuita.", x0, 530, INCHIOSTRO_SOFT)
    out.append(p)
    p, _ = testo(HANKEN, {"wght": 500}, 26, "Poi un consulente prepara il preventivo.", x0, 566, INCHIOSTRO_SOFT)
    out.append(p)
    # prospetto decorativo, senza importi
    sx, sy, sw, sh = 690, 118, 410, 400
    out.append(
        f'<g transform="rotate(2.2 {sx + sw / 2} {sy + sh / 2})"><rect x="{sx + 14}" y="{sy + 20}" width="{sw}" height="{sh}" rx="6" fill="#E8DAC2"/></g>'
    )
    g = [f'<rect x="{sx}" y="{sy}" width="{sw}" height="{sh}" rx="6" fill="#FFFDF8"/>']
    p, _ = testo(NEWS, {"wght": 600, "opsz": 24}, 30, "Prospetto del costo", sx + 34, sy + 62, INCHIOSTRO)
    g.append(p)
    g.append(f'<rect x="{sx + 34}" y="{sy + 84}" width="{sw - 68}" height="2" fill="{INCHIOSTRO}"/>')
    voci = ["Retribuzione lorda", "Contributi INPS", "TFR", "Premio INAIL", "Ferie e permessi"]
    y = sy + 130
    for i, v in enumerate(voci):
        if i == 0:
            g.append(f'<rect x="{sx + 24}" y="{y - 26}" width="{sw - 48}" height="36" rx="2" fill="{EVIDENZIATORE}"/>')
        p, lw = testo(HANKEN, {"wght": 500}, 22, v, sx + 34, y, INCHIOSTRO)
        g.append(p)
        barra = 70 if i == 0 else 52
        g.append(
            f'<line x1="{num(sx + 44 + lw)}" y1="{y - 4}" x2="{num(sx + sw - 46 - barra)}" y2="{y - 4}" '
            f'stroke="#CDBFA8" stroke-width="2.5" stroke-dasharray="1 6" stroke-linecap="round"/>'
        )
        g.append(f'<rect x="{sx + sw - 34 - barra}" y="{y - 13}" width="{barra}" height="10" rx="5" fill="{TERRACOTTA if i else INCHIOSTRO}" opacity="{1 if i == 0 else 0.55}"/>')
        y += 46
    g.append(f'<rect x="{sx + 34}" y="{y - 22}" width="{sw - 68}" height="2" fill="{INCHIOSTRO}"/>')
    p, _ = testo(HANKEN, {"wght": 700}, 23, "Costo totale", sx + 34, y + 18, INCHIOSTRO)
    g.append(p)
    g.append(f'<rect x="{sx + sw - 34 - 110}" y="{y + 1}" width="110" height="16" rx="8" fill="{TERRACOTTA_SCURA}"/>')
    out.append(f'<g transform="rotate(-1.4 {sx + sw / 2} {sy + sh / 2})">{"".join(g)}</g>')
    # post-it salvia
    px, py = 878, 508
    pg = [f'<rect x="{px}" y="{py}" width="250" height="104" rx="4" fill="{SALVIA}"/>']
    p, _ = testo(NEWS_IT, {"wght": 600, "opsz": 24}, 24, "E poi?", px + 20, py + 38, "#FFFFFF")
    pg.append(p)
    p, _ = testo(HANKEN, {"wght": 500}, 18, "Preventivo gratuito dal", px + 20, py + 66, "#FFFFFF")
    pg.append(p)
    p, _ = testo(HANKEN, {"wght": 500}, 18, "consulente del lavoro.", px + 20, py + 89, "#FFFFFF")
    pg.append(p)
    out.append(f'<g transform="rotate(2.5 {px + 125} {py + 52})">{"".join(pg)}</g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">\n' + "\n".join(out) + "\n</svg>\n"


def main():
    dest = sys.argv[1] if len(sys.argv) > 1 else "public/brand"
    os.makedirs(dest, exist_ok=True)
    marchio, ratio = marchio_svg()
    files = {
        "marchio.svg": marchio,
        "simbolo.svg": simbolo_svg(),
        "icona.svg": icona_svg(),
        "anteprima.svg": anteprima_svg(),
    }
    for nome, svg in files.items():
        with open(os.path.join(dest, nome), "w") as f:
            f.write(svg)
    print("MARCHIO_RATIO =", num(ratio))


if __name__ == "__main__":
    main()
