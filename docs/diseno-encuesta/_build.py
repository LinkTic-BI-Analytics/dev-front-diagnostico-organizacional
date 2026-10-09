# -*- coding: utf-8 -*-
import io
from _gen import (BY_SLUG, header, band, milestone, title, scale, anchors,
                  footer, page, shell)

W = io.open


# ---------------- Bloque 1 · Relacionamiento (C2, área 3 de 5) ----------------
ph = BY_SLUG['relacionamiento']

dots = []
for i in range(1, 6):
    if i < 3:
        s = 'background: %s;' % ph['ink']
    elif i == 3:
        s = 'background: %s; box-shadow: 0 0 0 3px %s;' % (ph['ink'], ph['subtle'])
    else:
        s = 'background: #dbe4ee;'
    dots.append('<div style="width: 9px; height: 9px; border-radius: 50%%; %s"></div>' % s)

sub = '''
    <div style="display: flex; flex-direction: column; gap: 10px; border-radius: 10px; background: {subtle}; border: 1px solid {border}; padding: 14px 18px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <p style="font-size: 13px; color: #5e5e61;">Está calificando a <strong style="color: {ink}; font-weight: 700;">Talento humano</strong></p>
        <p style="font-size: 12px; font-weight: 600; color: {ink};">Área 3 de 5</p>
      </div>
      <div style="display: flex; gap: 7px; align-items: center;">{dots}</div>
      <p style="font-size: 12px; color: #5e5e61;">Faltan dos áreas y termina el bloque más largo de la encuesta.</p>
    </div>
'''.format(subtle=ph['subtle'], border=ph['border'], ink=ph['ink'], dots=''.join(dots))

content = (
    band(ph, 'Bloque 1 · Relacionamiento', 'Componente 2 de 10 · Red de colaboración')
    + title(ph, '2. Red de colaboración',
            'Comprender cómo funciona LinkTIC permitirá fortalecer una red más colaborativa entre procesos.')
    + sub
    + '    <div style="display: flex; flex-direction: column; gap: 22px;">\n'
    + scale(ph, 'Facilidad para trabajar', '0 significa muy deficiente y 10 significa excelente.', 8)
    + scale(ph, 'Comunicación', None, 6)
    + scale(ph, 'Confianza', None, 9)
    + scale(ph, 'Cumplimiento', None, 7)
    + scale(ph, 'Generación de valor', None, None)
    + '      ' + anchors() + '\n'
    + '    </div>\n'
)
W('Bloque1Relacionamiento.dc.html', 'w', encoding='utf-8').write(
    page(ph, shell(ph, header(ph, 55, 5, 16, 9), content, footer(ph, 'Siguiente área'))))


# ---------------- Bloque 2 · Cómo funciona la empresa (C4) ----------------
ph = BY_SLUG['operacion']
content = (
    band(ph, 'Bloque 2 · Cómo funciona la empresa', 'Componente 4 de 10 · Aquí ya no califica áreas: califica la empresa')
    + title(ph, '4. Servicio interno',
            'Este componente permite identificar qué tan eficientes somos en la gestión interna y en la atención de solicitudes entre áreas.')
    + '    <div style="display: flex; flex-direction: column; gap: 22px;">\n'
    + scale(ph, 'Existe disposición para ayudar', '0 significa muy deficiente y 10 significa excelente.', 7)
    + scale(ph, 'Comprenden nuestras necesidades', None, 5)
    + scale(ph, 'Dan seguimiento a las solicitudes', None, 8)
    + scale(ph, 'Cumplen los compromisos', None, None)
    + scale(ph, 'Agregan valor al proceso', None, None)
    + '      ' + anchors() + '\n'
    + '    </div>\n'
)
W('Bloque2Operacion.dc.html', 'w', encoding='utf-8').write(
    page(ph, shell(ph, header(ph, 38, 9, 16, 6), content, footer(ph))))


# ---------------- Bloque 3 · Cultura (C7, primera pantalla → hito) ----------------
ph = BY_SLUG['cultura']
content = (
    milestone(ph, 'Cómo funciona la empresa', 'Ahora hablamos de cómo nos tratamos',
              'Dos pantallas, ≈ 2 minutos. Es el bloque más corto.')
    + title(ph, '7. Cultura colaborativa',
            'Como compañía, qué tipo de prácticas estamos construyendo en pro del trabajo conjunto, el aprendizaje compartido y la construcción de soluciones entre áreas.')
    + '    <div style="display: flex; flex-direction: column; gap: 22px;">\n'
    + scale(ph, 'Compartimos conocimiento', '0 significa muy deficiente y 10 significa excelente.', 9)
    + scale(ph, 'Existe confianza', None, 8)
    + scale(ph, 'Buscamos soluciones conjuntamente', None, None)
    + scale(ph, 'Hay apertura al aprendizaje', None, None)
    + scale(ph, 'Trabajamos por objetivos comunes', None, None)
    + '      ' + anchors() + '\n'
    + '    </div>\n'
)
W('Bloque3Cultura.dc.html', 'w', encoding='utf-8').write(
    page(ph, shell(ph, header(ph, 6, 12, 16, 4), content, footer(ph))))


# ---------------- Bloque 4 · Qué debemos cambiar (C10) ----------------
ph = BY_SLUG['cierre']

def chips(options, selected):
    out = []
    for label in options:
        if label in selected:
            s = 'border: 1px solid %s; background: %s; color: #ffffff; font-weight: 600;' % (ph['ink'], ph['ink'])
        else:
            s = 'border: 1px solid #dbe4ee; background: #ffffff; color: #333333; font-weight: 500;'
        out.append('<div style="padding: 9px 16px; border-radius: 999px; font-size: 13.5px; %s">%s</div>' % (s, label))
    return ('<div style="display: flex; flex-wrap: wrap; gap: 8px;">%s</div>' % ''.join(out))

def select(label, value, placeholder=False):
    color = '#5e5e61' if placeholder else '#333333'
    return '''
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <p style="font-size: 14px; font-weight: 600; color: #333333;">{label}</p>
        <div style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #dbe4ee; border-radius: 8px; background: #ffffff; padding: 12px 14px;">
          <span style="font-size: 14px; color: {color};">{value}</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5e5e61" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
'''.format(label=label, value=value, color=color)

content = (
    band(ph, 'Bloque 4 · Qué debemos cambiar', 'Componente 10 de 10 · Es lo que más se usa después')
    + title(ph, '10. Oportunidades de transformación',
            'Este ítem permite identificar barreras, oportunidades y prioridades de mejora para fortalecer el trabajo entre áreas.')
    + '    <div style="display: flex; flex-direction: column; gap: 22px;">\n'
    + '''
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <p style="font-size: 14px; font-weight: 600; color: #333333;">¿Cuál considera que hoy es el mayor obstáculo para trabajar entre áreas?</p>
          <p style="font-size: 12px; color: #5e5e61;">Marque una o varias opciones.</p>
        </div>
        ''' + chips(['Comunicación', 'Procesos', 'Tecnología', 'Roles', 'Liderazgo',
                     'Planeación', 'Prioridades', 'Cultura'], {'Procesos', 'Prioridades'}) + '''
      </div>
'''
    + select('¿Qué proceso genera más reprocesos?', 'Gestión de contratación pública')
    + select('¿Qué área genera mayor valor para LinkTIC?', 'Seleccione…', placeholder=True)
    + select('¿Qué área considera que necesita fortalecer su relacionamiento?', 'Seleccione…', placeholder=True)
    + '''
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <p style="font-size: 14px; font-weight: 600; color: #333333;">Si pudiera cambiar una sola cosa de LinkTIC para mejorar el trabajo entre áreas, ¿cuál sería?<span style="margin-left: 8px; font-size: 12px; font-weight: 400; color: #5e5e61;">(opcional)</span></p>
        </div>
        <div style="border: 1px solid #dbe4ee; border-radius: 8px; background: #ffffff; padding: 13px 14px; min-height: 84px;">
          <span style="font-size: 14px; color: #918f94;">Escriba aquí si quiere dejarlo por escrito. Puede enviar sin llenarlo.</span>
        </div>
      </div>
    </div>
'''
)
W('Bloque4Cierre.dc.html', 'w', encoding='utf-8').write(
    page(ph, shell(ph, header(ph, 60, 15, 16, 2), content, footer(ph, 'Revisar y enviar'))))

print('4 artboards escritos')
