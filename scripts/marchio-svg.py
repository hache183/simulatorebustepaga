#!/usr/bin/env python3
"""Marchio Costi Lavoro Italia (solo scritta) in SVG vettoriale.

Genera i master in public/brand/: marchio-panna.svg, marchio-navy.svg, icona.svg, anteprima.svg.
I glifi sono i contorni veri di Fraunces (opsz 144, wght 600, SOFT 25, WONK 0) e Cinzel (wght 500),
quindi gli SVG non dipendono da font caricati. Servono fontTools e i TTF variabili di Google Fonts:
aggiorna i percorsi FR / CI / PLEX qui sotto. Uso: python3 scripts/marchio-svg.py public/brand
"""
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import sys, os

FR = "/usr/share/fonts/truetype/sand-box/google/Fraunces/Fraunces-VariableFont_SOFT,WONK,opsz,wght.ttf"
CI = "/usr/share/fonts/truetype/sand-box/google/Cinzel/Cinzel-VariableFont_wght.ttf"
NAVY = "#071F45"; CREAM = "#EDEAE3"; GREEN = "#1F8A4C"; RED = "#C91C30"
CREAM_BAR = "#F4F0E6"; WHITE_BAR = "#FCFAF5"

_cache = {}
def inst(path, axes):
    k = (path, tuple(sorted(axes.items())))
    if k not in _cache:
        _cache[k] = instantiateVariableFont(TTFont(path), axes)
    return _cache[k]

class Run:
    """Lettere affiancate per bounding box, base allineata in basso (come actual_text)."""
    def __init__(self, font, size, text, tracking=0):
        self.font, self.size = font, size
        gs = font.getGlyphSet(); cmap = font.getBestCmap()
        s = size / font['head'].unitsPerEm
        self.items = []  # (glyphname or None, x_offset, bounds)
        x = 0; h = 0
        for i, ch in enumerate(text):
            if ch == ' ':
                x += int(size * 0.42); continue
            g = cmap[ord(ch)]
            bp = BoundsPen(gs); gs[g].draw(bp)
            xmin, ymin, xmax, ymax = [v * s for v in bp.bounds]
            w = xmax - xmin
            self.items.append((g, x, (xmin, ymin, xmax, ymax)))
            h = max(h, ymax - ymin)
            x += w
            if i < len(text) - 1: x += tracking
        self.w, self.h, self.s, self.gs = x - (tracking if text and text[-1] != ' ' and tracking else 0), h, s, gs

    def paths(self, ox, oy):
        out = []
        for g, x, (xmin, ymin, xmax, ymax) in self.items:
            pen = SVGPathPen(self.gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
            # font y-up -> svg y-down; bottom of bbox at oy + h
            tx = ox + x - xmin
            ty = oy + self.h + ymin
            tp = TransformPen(pen, (self.s, 0, 0, -self.s, tx, ty))
            self.gs[g].draw(tp)
            out.append(pen.getCommands())
        return ' '.join(out)

def wordmark(fg, name_size=280):
    fr = inst(FR, {'opsz': 144, 'wght': 600, 'SOFT': 25, 'WONK': 0})
    ci = inst(CI, {'wght': 500})
    name = Run(fr, name_size, "Costi Lavoro")
    italia = Run(ci, int(name_size * 0.26), "ITALIA", tracking=int(name_size * 0.08))
    rule_w = max(int(name.w * 0.42), italia.w)
    rule_h = max(3, int(name_size * 0.032))
    gap1 = gap2 = int(name_size * 0.14)
    W = name.w; H = name.h + gap1 + rule_h + gap2 + italia.h
    rx = (W - rule_w) / 2; ry = name.h + gap1; seg = rule_w / 3
    mid = WHITE_BAR if fg == NAVY else CREAM_BAR
    ix = (W - italia.w) / 2; iy = ry + rule_h + gap2
    f = lambda v: ('%.2f' % v).rstrip('0').rstrip('.')
    return W, H, f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(W)} {f(H)}" width="{f(W)}" height="{f(H)}" role="img" aria-label="Costi Lavoro Italia">
<title>Costi Lavoro Italia</title>
<path fill="{fg}" d="{name.paths(0, 0)}"/>
<rect x="{f(rx)}" y="{f(ry)}" width="{f(seg - 2)}" height="{rule_h}" fill="{GREEN}"/>
<rect x="{f(rx + seg)}" y="{f(ry)}" width="{f(seg - 2)}" height="{rule_h}" fill="{mid}"/>
<rect x="{f(rx + 2 * seg)}" y="{f(ry)}" width="{f(seg)}" height="{rule_h}" fill="{RED}"/>
<path fill="{fg}" d="{italia.paths(ix, iy)}"/>
</svg>
'''

def favicon(size=256):
    fr = inst(FR, {'opsz': 144, 'wght': 550, 'SOFT': 20, 'WONK': 0})
    c = Run(fr, int(size * 0.78), "C")
    x = (size - c.w) // 2 - int(size * 0.01)
    y = (size - c.h) // 2 - int(size * 0.04)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
<rect width="{size}" height="{size}" fill="{NAVY}"/>
<path fill="{CREAM}" d="{c.paths(x, y)}"/>
</svg>
'''

if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for name, fg in (('marchio-panna.svg', CREAM), ('marchio-navy.svg', NAVY)):
        W, H, svg = wordmark(fg)
        open(os.path.join(out, name), 'w').write(svg)
        print(name, W, H, len(svg))
    svg = favicon()
    open(os.path.join(out, 'icona.svg'), 'w').write(svg); print('icona.svg', len(svg))


PLEX = "/usr/share/fonts/truetype/sand-box/google/IBM Plex Mono/IBMPlexMono-Regular.ttf"

def text_path(font, size, text, x, baseline, tracking=0.0):
    """Testo con avanzamenti tipografici (hmtx), per l'immagine di anteprima."""
    gs = font.getGlyphSet(); cmap = font.getBestCmap(); hmtx = font['hmtx']
    s = size / font['head'].unitsPerEm
    cmds = []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, baseline)))
        cmds.append(pen.getCommands())
        x += hmtx[g][0] * s + tracking
    return ' '.join(c for c in cmds if c), x

def og(W=1200, H=630):
    _, wh, wm = wordmark(CREAM)
    ww = 1405.2178086762988; wsc = 96 / wh  # wordmark alto 96px
    inner = wm.split('\n', 2)[2].rsplit('</svg>', 1)[0]  # path + rect senza intestazione
    fr = inst(FR, {'opsz': 144, 'wght': 600, 'SOFT': 0, 'WONK': 0})
    mono = TTFont(PLEX)
    l1, _ = text_path(fr, 96, "Lo stipendio è solo", 80, 330, tracking=-1.9)
    l2, _ = text_path(fr, 96, "la prima riga.", 80, 432, tracking=-1.9)
    m, _ = text_path(mono, 20, "SIMULATORE DEL COSTO DEL LAVORO", 80, 560, tracking=2.4)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<rect width="{W}" height="{H}" fill="#0A0B0D"/>
<g transform="translate(80 64) scale({wsc:.5f})">
{inner}</g>
<path fill="{CREAM}" d="{l1}"/>
<path fill="{CREAM}" d="{l2}"/>
<rect x="80" y="500" width="{W - 160}" height="1" fill="{CREAM}" fill-opacity="0.28"/>
<rect x="80" y="545" width="12" height="12" fill="{GREEN}"/>
<path fill="#8E8B83" d="{m.replace('M', 'M', 1)}" transform="translate(28 0)"/>
</svg>
'''

if __name__ == '__main__':
    open(os.path.join(sys.argv[1], 'anteprima.svg'), 'w').write(og()); print('anteprima.svg')
