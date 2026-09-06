"""Extract licensed Instrument glyph outlines for dependency-free SVG generation."""
import hashlib
import json
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]


def extract(filename, axes=None):
    path = ROOT / 'assets' / filename
    font = TTFont(path)
    if axes:
        font = instantiateVariableFont(font, axes, inplace=False)
    cmap = font.getBestCmap()
    glyph_set = font.getGlyphSet()
    chars = {chr(code): cmap[code] for code in range(32, 127)}
    glyphs = {}
    for char, name in chars.items():
        pen = SVGPathPen(glyph_set, ntos=lambda v: str(round(v, 2)))
        glyph_set[name].draw(pen)
        glyphs[char] = {'path': pen.getCommands(), 'advance': font['hmtx'][name][0]}

    kern = {}
    if 'GPOS' in font:
        table = font['GPOS'].table
        indices = {i for record in table.FeatureList.FeatureRecord if record.FeatureTag == 'kern'
                   for i in record.Feature.LookupListIndex}
        for index in sorted(indices):
            lookup = table.LookupList.Lookup[index]
            for sub in lookup.SubTable:
                kind = lookup.LookupType
                if kind == 9:
                    kind, sub = sub.ExtensionLookupType, sub.ExtSubTable
                if kind != 2:
                    continue
                for left, left_name in chars.items():
                    if left_name not in sub.Coverage.glyphs:
                        continue
                    for right, right_name in chars.items():
                        value = None
                        if sub.Format == 1:
                            pairs = sub.PairSet[sub.Coverage.glyphs.index(left_name)].PairValueRecord
                            pair = next((p for p in pairs if p.SecondGlyph == right_name), None)
                            value = pair.Value1 if pair else None
                        elif sub.Format == 2:
                            c1 = sub.ClassDef1.classDefs.get(left_name, 0)
                            c2 = sub.ClassDef2.classDefs.get(right_name, 0)
                            value = sub.Class1Record[c1].Class2Record[c2].Value1
                        adjustment = getattr(value, 'XAdvance', 0) if value else 0
                        if adjustment:
                            key = left + right
                            kern[key] = kern.get(key, 0) + adjustment
    return {'file': filename, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'axes': axes, 'units': font['head'].unitsPerEm, 'glyphs': glyphs, 'kern': kern}


result = {
    'sans': extract('InstrumentSans.ttf', {'wght': 500, 'wdth': 95}),
    'serif': extract('InstrumentSerif.ttf'),
}
(ROOT / 'data/typography.json').write_text(json.dumps(result, separators=(',', ':')) + '\n', encoding='utf-8')
print('Prepared Instrument Sans and Instrument Serif outlines, kerning, and source hashes.')
