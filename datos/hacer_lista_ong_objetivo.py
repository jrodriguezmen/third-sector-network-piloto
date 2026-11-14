"""Genera ong_objetivo_piloto.csv a partir de los datos de la CONGDE (Informe del Sector 2025, datos de 2024).
Criterios: ONGD estatal, ingresos entre 0,3 y 10 M EUR, empresas y fundaciones <= 10 % de los ingresos.
Se queda con las 30 primeras. Orden: sede en Madrid primero; dentro de cada grupo, mayor dependencia de dinero publico primero.
Uso: python3 hacer_lista_ong_objetivo.py
"""
import csv, json, re, unicodedata

def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'\(.*?\)', '', s)
    s = re.sub(r'\b(fundacion|asociacion|espana|ongd|de|la|el|por|para|y)\b', '', s)
    return re.sub(r'[^a-z0-9]', '', s)

num = lambda v: float(v) if v else 0.0
filas = [x for x in csv.DictReader(open('ongd_proyectos_y_financiacion_2024.csv', encoding='utf-8')) if x['ambito'] == 'Estatal']
socias = {norm(x['nombre']): x for x in json.load(open('congde_socias.json', encoding='utf-8')) if x['tipo'] == 'ongd'}
tam = {norm(x['ongd']): x for x in csv.DictReader(open('congde_informe_2025/data_forma_juridica_tamanho.csv', encoding='utf-8'))}

# Nombres que no casan solos entre el informe y el directorio de socias
ALIAS = {'AIDA': 'Fundación AIDA Ayuda, Intercambio y Desarrollo Activo'}
SEDE = {'NOVACT': 'Barcelona'}  # en el directorio la ciudad figura en el campo de direccion

def socia(nombre):
    k = norm(ALIAS.get(nombre, nombre))
    if k in socias:
        return socias[k]
    c = [v for kk, v in socias.items() if k and (k in kk or kk in k)]
    return c[0] if len(c) == 1 else None

out = []
for x in filas:
    total, pct_emp = num(x['total_eur']), num(x['pct_empresas_fundaciones'])
    if not (300_000 <= total <= 10_000_000) or pct_emp > 10:
        continue
    s = socia(x['ongd']) or {}
    t = tam.get(norm(x['ongd']), {})
    out.append({
        'ongd': x['ongd'],
        'sede': SEDE.get(x['ongd']) or s.get('ciudad', ''),
        'web': s.get('web', ''),
        'forma_juridica': t.get('forma', ''),
        'personal': t.get('personal', ''),
        'proyectos': x['proyectos'].replace('.0', ''),
        'ingresos_2024_meur': f'{total/1e6:.2f}',
        'pct_publico': x['pct_publico'],
        'pct_empresas_fundaciones': x['pct_empresas_fundaciones'],
        'empresas_fundaciones_eur': f"{num(x['empresas_fundaciones_eur']):.0f}",
    })
out.sort(key=lambda r: (r['sede'] != 'Madrid', -num(r['pct_publico'])))
out = out[:30]
for i, r in enumerate(out, 1):
    r['prioridad'] = i
campos = ['prioridad'] + [c for c in out[0] if c != 'prioridad']
with open('ong_objetivo_piloto.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=campos); w.writeheader(); w.writerows(out)
print(len(out), 'ONGD')
