# -*- coding: utf-8 -*-
import io
from _gen import BY_SLUG, HEAD, PHASES, NEUTRAL_SEG

ph = BY_SLUG['cultura']

def segs(current, done):
    out = []
    for p in PHASES:
        fill = 100 if p['n'] < current else (done if p['n'] == current else 0)
        bg = p['ink'] if p['n'] <= current else NEUTRAL_SEG
        out.append('<div style="flex-grow: 1; height: 6px; border-radius: 3px; background: %s; overflow: hidden;">'
                   '<div style="width: %d%%; height: 100%%; border-radius: 3px; background: %s;"></div></div>'
                   % (NEUTRAL_SEG, fill, bg))
    return ''.join(out)

# Escala 0-10 en dos filas de seis, con objetivo táctil de 46 px.
def scale_mobile(label, help_text, selected):
    cells = []
    for v in range(11):
        if v == selected:
            s = 'border: 1px solid %s; background: %s; color: #ffffff; font-weight: 700;' % (ph['ink'], ph['ink'])
        else:
            s = 'border: 1px solid #dbe4ee; background: #ffffff; color: #333333; font-weight: 500;'
        cells.append('<div style="display: flex; align-items: center; justify-content: center; height: 46px; '
                     'border-radius: 8px; font-size: 15px; %s">%d</div>' % (s, v))
    help_html = ('<p style="font-size: 12px; color: #5e5e61;">%s</p>' % help_text) if help_text else ''
    return '''
      <div style="display: flex; flex-direction: column; gap: 9px;">
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <p style="font-size: 15px; font-weight: 600; line-height: 1.35; color: #333333;">{label}</p>
          {help_html}
        </div>
        <div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px;">{cells}</div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #918f94;">
          <span>0 · muy deficiente</span><span>10 · excelente</span>
        </div>
      </div>
'''.format(label=label, help_html=help_html, cells=''.join(cells))

body = '''<div style="display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">

  <div style="position: sticky; top: 0; z-index: 5; background: rgba(255,255,255,0.95); backdrop-filter: blur(6px); border-bottom: 1px solid #dbe4ee; padding: 12px 20px 10px;">
    <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 7px;">
      <p style="font-size: 12px; font-weight: 700; color: {ink};">Bloque 3 de 4 · Cultura</p>
      <p style="font-size: 11px; color: #5e5e61;">≈ 4 min</p>
    </div>
    <div style="display: flex; gap: 4px;">{segs}</div>
  </div>

  <div style="flex-grow: 1; overflow: hidden; padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 18px;">

    <div style="display: flex; gap: 11px; align-items: center; border-radius: 10px; background: {subtle}; border: 1px solid {border}; border-left: 5px solid {accent}; padding: 12px 14px;">
      <div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; background: {ink}; flex-shrink: 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{icon}</svg>
      </div>
      <div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1; min-width: 0;">
        <p style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: {ink};">Bloque 3 · Cultura</p>
        <p style="font-size: 12px; line-height: 1.4; color: #5e5e61;">Terminó «Cómo funciona la empresa». Faltan dos bloques cortos.</p>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 6px;">
      <h2 style="font-size: 21px; line-height: 1.22; font-weight: 700; letter-spacing: -0.01em; margin: 0; color: {ink};">7. Cultura colaborativa</h2>
      <p style="font-size: 13.5px; line-height: 1.6; color: #5e5e61;">Qué prácticas estamos construyendo en pro del trabajo conjunto y el aprendizaje compartido.</p>
    </div>

    {scales}

  </div>

  <div style="position: sticky; bottom: 0; background: rgba(255,255,255,0.96); backdrop-filter: blur(6px); border-top: 1px solid #dbe4ee; padding: 11px 20px 16px;">
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 9px;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="{ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      <span style="font-size: 11px; color: #5e5e61;">Guardado · puede cerrar y seguir después</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="display: flex; align-items: center; justify-content: center; width: 50px; height: 50px; border-radius: 8px; border: 1px solid #dbe4ee; flex-shrink: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5e5e61" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
      </div>
      <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; gap: 8px; height: 50px; border-radius: 8px; background: {ink};">
        <span style="font-size: 15px; font-weight: 700; color: #ffffff;">Continuar</span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </div>
    </div>
  </div>

</div>
'''.format(ink=ph['ink'], subtle=ph['subtle'], border=ph['border'], accent=ph['accent'],
           icon=ph['icon'], segs=segs(3, 6),
           scales=scale_mobile('Compartimos conocimiento', '0 muy deficiente · 10 excelente.', 9)
                  + scale_mobile('Existe confianza', None, None))

io.open('Movil.dc.html', 'w', encoding='utf-8').write(
    HEAD.format(page_bg='#ffffff', ink=ph['ink']) + body + '</x-dc>\n</body>\n</html>\n')
print('Movil.dc.html ok')
