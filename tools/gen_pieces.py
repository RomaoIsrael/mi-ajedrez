"""Genera el set conceptual Royal Modern (SVG 45x45) y la lámina de presentación.

Uso: python3 tools/gen_pieces.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "pieces" / "royal-modern"

COLORS = {
    "w": dict(light="#FFFFFF", base="#F7F3EA", dark="#D9D0BC", stroke="#0F1B2D", detail="#0F1B2D"),
    "b": dict(light="#3A4B66", base="#1B2638", dark="#0E1522", stroke="#0B1220", detail="#8FA0BA"),
}
EYE = "#C9A227"  # latón: la chispa de comprensión

PLINTH = "M9 39h27a1.5 1.5 0 0 0 1.5-1.5v-1a2 2 0 0 0-2-2h-24a2 2 0 0 0-2 2v1A1.5 1.5 0 0 0 9 39z"

# Cada pieza: lista de (tipo, datos). "fill" = relleno con degradado, "line" = detalle sin relleno.
PIECES = {
    "P": [
        ("fill", "M16.5 34.5C17 27.5 19.5 24 20 22h5c.5 2 3 5.5 3.5 12.5z"),
        ("fill", "M18 19.5h9a1.5 1.5 0 0 1 0 3h-9a1.5 1.5 0 0 1 0-3z"),
        ("circle", (22.5, 14, 5.5)),
    ],
    "R": [
        ("fill", "M14 34.5 15.5 19.5h14L31 34.5z"),
        ("fill", "M13.5 17h18a1.25 1.25 0 0 1 0 2.5h-18a1.25 1.25 0 0 1 0-2.5z"),
        ("fill", "M12.5 17V9.5H17v3h2.5v-3h6v3H28v-3h4.5V17z"),
        ("line", "M16 23.5h13"),
    ],
    "B": [
        ("fill", "M16 34.5c.5-5.5 2-8.5 3.5-10.5h6c1.5 2 3 5 3.5 10.5z"),
        ("fill", "M17.5 21.5h10a1.25 1.25 0 0 1 0 2.5h-10a1.25 1.25 0 0 1 0-2.5z"),
        ("fill", "M22.5 7.5c4.5 4 6.5 8 5 11.5-1 2.5-3 3.5-5 3.5s-4-1-5-3.5c-1.5-3.5.5-7.5 5-11.5z"),
        ("circle", (22.5, 5.6, 1.7)),
        ("line", "M20 16.5 26 12"),
    ],
    "N": [
        ("fill", "M15 34.5c.5-5.5 2.5-8.5 5-11-2.5 0-4.5 1-6.5.5-2.5-.5-3.2-2.5-2.3-4.5L17 11.5c1.5-2 3-3 4.5-3.5L23 4.5l2.5 3.3c5 1.2 6.5 6.7 6 12.2-.5 5-1.5 9-1 14.5z"),
        ("line", "M25.5 10.5 28 14M27.5 16.5l2.3 3.5M28.5 23l1.5 3"),
        ("eye", (19.6, 13.2, 1.2)),
        ("dot", (13.3, 21.2, 0.6)),
    ],
    "Q": [
        ("fill", "M15 34.5c.5-6.5 3-12.5 4-15h7c1 2.5 3.5 8.5 4 15z"),
        ("fill", "M14 17h17a1.25 1.25 0 0 1 0 2.5H14a1.25 1.25 0 0 1 0-2.5z"),
        ("fill", "M13.5 17 11.5 10.5l5 3.5 2.5-5.5 3.5 4.5 3.5-4.5 2.5 5.5 5-3.5-2 6.5z"),
        ("circle", (11.5, 9.3, 1.5)), ("circle", (19, 7.6, 1.5)), ("circle", (22.5, 9.8, 1.5)),
        ("circle", (26, 7.6, 1.5)), ("circle", (33.5, 9.3, 1.5)),
    ],
    "K": [
        ("fill", "M13.5 34.5c.5-6.5 3-11.5 4-13h10c1 1.5 3.5 6.5 4 13z"),
        ("fill", "M15 19h15a1.25 1.25 0 0 1 0 2.5H15a1.25 1.25 0 0 1 0-2.5z"),
        ("fill", "M15.5 19c-1-5 2-7.5 7-7.5s8 2.5 7 7.5z"),
        ("fill", "M21.25 3.5h2.5V6h2.5v2.5h-2.5v3h-2.5v-3h-2.5V6h2.5z"),
    ],
}


def gradient(gid: str, c: dict) -> str:
    return (
        f'<linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="0">'
        f'<stop offset="0" stop-color="{c["light"]}"/>'
        f'<stop offset=".35" stop-color="{c["base"]}"/>'
        f'<stop offset="1" stop-color="{c["dark"]}"/>'
        "</linearGradient>"
    )


def piece_body(color: str, kind: str, gid: str) -> str:
    c = COLORS[color]
    common = f'stroke="{c["stroke"]}" stroke-width="1.4" stroke-linejoin="round"'
    parts = [f'<ellipse cx="22.5" cy="40.2" rx="13" ry="1.6" fill="#0F1B2D" opacity=".18"/>',
             f'<path d="{PLINTH}" fill="url(#{gid})" {common}/>']
    for typ, data in PIECES[kind]:
        if typ == "fill":
            parts.append(f'<path d="{data}" fill="url(#{gid})" {common}/>')
        elif typ == "circle":
            x, y, r = data
            parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#{gid})" {common}/>')
        elif typ == "line":
            parts.append(f'<path d="{data}" fill="none" stroke="{c["detail"]}" stroke-width="1" stroke-linecap="round" opacity=".7"/>')
        elif typ == "eye":
            x, y, r = data
            parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{EYE}" stroke="{c["stroke"]}" stroke-width=".5"/>')
        elif typ == "dot":
            x, y, r = data
            parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c["stroke"]}"/>')
    return "".join(parts)


def piece_svg(color: str, kind: str) -> str:
    gid = f"g{color}{kind}"
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="45" height="45">'
        f"<title>Royal Modern {color}{kind}</title>"
        f"<defs>{gradient(gid, COLORS[color])}</defs>"
        f"{piece_body(color, kind, gid)}</svg>\n"
    )


def sheet_svg() -> str:
    order = "KQRBNP"
    cell, pad = 90, 20
    w, h = pad * 2 + cell * 6, pad * 2 + cell * 2 + 60
    defs, body = [], []
    for row, color in enumerate("wb"):
        for col, kind in enumerate(order):
            gid = f"s{color}{kind}"
            defs.append(gradient(gid, COLORS[color]))
            x, y = pad + col * cell, pad + 50 + row * cell
            sq = "#E9E4D8" if (row + col) % 2 == 0 else "#6A7A93"
            body.append(f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" fill="{sq}"/>')
            body.append(f'<g transform="translate({x},{y}) scale(2)">{piece_body(color, kind, gid)}</g>')
    title = (f'<text x="{pad}" y="{pad + 28}" font-family="Fraunces, Georgia, serif" font-size="26" '
             'font-weight="600" fill="#0F1B2D">Royal Modern · set conceptual</text>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
        f'<defs>{"".join(defs)}</defs><rect width="{w}" height="{h}" rx="16" fill="#F7F3EA"/>'
        f'{title}{"".join(body)}</svg>\n'
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for color in "wb":
        for kind in PIECES:
            (OUT / f"{color}{kind}.svg").write_text(piece_svg(color, kind))
    (OUT / "sheet.svg").write_text(sheet_svg())


if __name__ == "__main__":
    main()
