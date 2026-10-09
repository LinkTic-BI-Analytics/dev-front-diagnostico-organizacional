# -*- coding: utf-8 -*-
import io

NEUTRAL_SEG = '#dbe4ee'

PHASES = [
    dict(slug='relacionamiento', n=1, name='Relacionamiento',
         ink='#0061c2', accent='#0080ff', subtle='#e6f2ff', border='#b3d4f5',
         icon='<circle cx="12" cy="5" r="2.4"/><circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M10.6 7 6.4 15.8M13.4 7l4.2 8.8M7.4 18h9.2"/>'),
    dict(slug='operacion', n=2, name='Cómo funciona la empresa',
         ink='#0d6d5f', accent='#1eae98', subtle='#e2f5f1', border='#a9ddd3',
         icon='<path d="M4 7h10M4 12h16M4 17h7"/><circle cx="18" cy="7" r="2.2"/><circle cx="14" cy="17" r="2.2"/>'),
    dict(slug='cultura', n=3, name='Cultura',
         ink='#12690a', accent='#1dd600', subtle='#e8f9e3', border='#b4e6a8',
         icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6M18.2 15.6A5.5 5.5 0 0 1 20.5 19"/>'),
    dict(slug='cierre', n=4, name='Qué debemos cambiar',
         ink='#8a5300', accent='#ffc947', subtle='#fff4de', border='#f0d49a',
         icon='<path d="M12 3v2M5 7.5 6.4 8.9M19 7.5 17.6 8.9M4 15h2M18 15h2"/><path d="M9.2 18.5h5.6M10 21h4"/><path d="M12 8a4.5 4.5 0 0 0-2.6 8.2h5.2A4.5 4.5 0 0 0 12 8Z"/>'),
]
BY_SLUG = {p['slug']: p for p in PHASES}

HEAD = '''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;900&display=swap">
  <style>
    body {{ margin: 0; background: {page_bg}; color: #333333;
           font-family: Montserrat, Calibri, system-ui, sans-serif;
           -webkit-font-smoothing: antialiased; }}
    a {{ color: {ink}; }} a:hover {{ color: {ink}; }}
    h1 {{ font-weight: 900; letter-spacing: -0.02em; margin: 0; }}
    h2, h3 {{ font-weight: 700; letter-spacing: -0.01em; margin: 0; }}
    p {{ margin: 0; }}
  </style>
</helmet>
'''


def segments(current, done_in_current):
    """Barra de cuatro tramos: uno por bloque, cada uno con su color."""
    out = []
    for p in PHASES:
        if p['n'] < current:
            fill, bg = 100, p['ink']
        elif p['n'] == current:
            fill, bg = done_in_current, p['ink']
        else:
            fill, bg = 0, NEUTRAL_SEG
        out.append(
            '<div style="flex-grow: 1; height: 7px; border-radius: 4px; background: %s; overflow: hidden;">'
            '<div style="width: %d%%; height: 100%%; border-radius: 4px; background: %s;"></div></div>'
            % (NEUTRAL_SEG, fill, bg)
        )
    return ''.join(out)


def seg_labels(current):
    out = []
    for p in PHASES:
        done = p['n'] < current
        cur = p['n'] == current
        color = p['ink'] if (cur or done) else '#918f94'
        weight = 700 if cur else 500
        check = ('<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="3.2" '
                 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' % p['ink']) if done else ''
        out.append(
            '<div style="flex-grow: 1; display: flex; align-items: center; gap: 4px; min-width: 0;">%s'
            '<span style="font-size: 10.5px; font-weight: %d; color: %s; text-transform: uppercase; letter-spacing: 0.05em; '
            'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">%s</span></div>'
            % (check, weight, color, p['name'])
        )
    return ''.join(out)


def header(ph, current_done, screen, total, minutes):
    return '''
  <div style="position: sticky; top: 0; z-index: 5; background: rgba(255,255,255,0.94); backdrop-filter: blur(6px); border-bottom: 1px solid #dbe4ee;">
    <div style="max-width: 672px; margin: 0 auto; padding: 14px 48px 12px; display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px;">
        <p style="font-size: 12.5px; font-weight: 600; color: {ink};">Bloque {n} de 4 · {name}</p>
        <p style="font-size: 12px; color: #5e5e61;">Pantalla {screen} de {total} · quedan ≈ {minutes} min</p>
      </div>
      <div style="display: flex; gap: 5px;">{segs}</div>
      <div style="display: flex; gap: 5px;">{labels}</div>
    </div>
  </div>
'''.format(ink=ph['ink'], n=ph['n'], name=ph['name'], screen=screen, total=total,
           minutes=minutes, segs=segments(ph['n'], current_done), labels=seg_labels(ph['n']))


def band(ph, kicker, sub):
    return '''
    <div style="display: flex; gap: 14px; align-items: center; border-radius: 10px; background: {subtle}; border: 1px solid {border}; border-left: 5px solid {accent}; padding: 14px 18px;">
      <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 9px; background: {ink}; flex-shrink: 0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{icon}</svg>
      </div>
      <div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1;">
        <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: {ink};">{kicker}</p>
        <p style="font-size: 13px; color: #5e5e61;">{sub}</p>
      </div>
    </div>
'''.format(**ph, kicker=kicker, sub=sub)


def milestone(ph, prev_name, promise, screens):
    """Hito: aparece solo en la primera pantalla de un bloque."""
    return '''
    <div style="display: flex; flex-direction: column; gap: 12px; border-radius: 10px; background: {subtle}; border: 1px solid {border}; border-left: 5px solid {accent}; padding: 18px 20px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        <p style="font-size: 12.5px; font-weight: 600; color: {ink};">Terminó «{prev_name}». Van {n_done} de 4 bloques.</p>
      </div>
      <div style="display: flex; gap: 14px; align-items: center;">
        <div style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 10px; background: {ink}; flex-shrink: 0;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{icon}</svg>
        </div>
        <div style="display: flex; flex-direction: column; gap: 3px; flex-grow: 1;">
          <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: {ink};">Bloque {n} · {name}</p>
          <h3 style="font-size: 16px; color: #333333;">{promise}</h3>
          <p style="font-size: 12.5px; color: #5e5e61;">{screens}</p>
        </div>
      </div>
    </div>
'''.format(subtle=ph['subtle'], border=ph['border'], accent=ph['accent'], ink=ph['ink'],
           icon=ph['icon'], n=ph['n'], name=ph['name'], n_done=ph['n'] - 1,
           prev_name=prev_name, promise=promise, screens=screens)


def title(ph, text, intro):
    return '''
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <h2 style="font-size: 25px; line-height: 1.2; color: {ink};">{text}</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #5e5e61;">{intro}</p>
    </div>
'''.format(ink=ph['ink'], text=text, intro=intro)


def scale(ph, label, help_text, selected, height=38):
    cells = []
    for v in range(11):
        if v == selected:
            style = ('border: 1px solid %s; background: %s; color: #ffffff; font-weight: 700;' % (ph['ink'], ph['ink']))
        else:
            style = 'border: 1px solid #dbe4ee; background: #ffffff; color: #333333; font-weight: 500;'
        cells.append(
            '<div style="display: flex; align-items: center; justify-content: center; height: %dpx; border-radius: 7px; font-size: 14px; %s">%d</div>'
            % (height, style, v)
        )
    help_html = ('<p style="font-size: 12px; color: #5e5e61;">%s</p>' % help_text) if help_text else ''
    return '''
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <p style="font-size: 14px; font-weight: 600; color: #333333;">{label}</p>
          {help_html}
        </div>
        <div style="display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); gap: 6px;">{cells}</div>
      </div>
'''.format(label=label, help_html=help_html, cells=''.join(cells))


def anchors():
    return ('<div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #918f94;">'
            '<span>0 · muy deficiente</span><span>10 · excelente</span></div>')


def footer(ph, next_label='Continuar', saved='Guardado hace un momento'):
    return '''
  <div style="position: sticky; bottom: 0; background: rgba(255,255,255,0.94); backdrop-filter: blur(6px); border-top: 1px solid #dbe4ee;">
    <div style="max-width: 672px; margin: 0 auto; padding: 14px 48px 18px; display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 7px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="{ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        <span style="font-size: 11.5px; color: #5e5e61;">{saved} · puede cerrar y seguir después en este navegador</span>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 6px; padding: 11px 16px; border-radius: 8px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5e5e61" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
          <span style="font-size: 14px; font-weight: 500; color: #5e5e61;">Atrás</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; border-radius: 8px; background: {ink}; padding: 12px 26px;">
          <span style="font-size: 14px; font-weight: 700; color: #ffffff;">{next_label}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
      </div>
    </div>
  </div>
'''.format(ink=ph['ink'], next_label=next_label, saved=saved)


def page(ph, body, page_bg='#ffffff'):
    return (HEAD.format(page_bg=page_bg, ink=ph['ink']) + body + '</x-dc>\n</body>\n</html>\n')


def shell(ph, header_html, content, footer_html):
    return '''<div style="display: flex; flex-direction: column; min-height: 100%;">
{header}
  <div style="flex-grow: 1; max-width: 672px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 26px 48px 32px; display: flex; flex-direction: column; gap: 24px;">
{content}
  </div>
{footer}
</div>
'''.format(header=header_html, content=content, footer=footer_html)
