#!/usr/bin/env python3
"""Arma Novi dentro de la web y genera el archivo de paquetes para Apps Script.

Uso (desde la raíz del repositorio):  python3 herramientas/armar.py

- Junta novi/diccionario.js + novi/motor.js + novi/novi.js y novi/novi.css, y los mete entre los
  marcadores NOVI:JS / NOVI:CSS de base/01-web/index.html y demo/index.html.
- Copia base/01-web/index.html a base/01-web/mayorista/index.html (son el mismo archivo).
- Genera base/02-backend/NoviPaquetes.gs con todos los paquetes de novi/paquetes/.
"""
import json, os, re, shutil, sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
R = lambda *p: os.path.join(RAIZ, *p)

# Qué paquetes de preguntas ve cada demo (en modo demo, sin backend)
DESTINOS = {
    "base/01-web/index.html": ["general"],
    "demo/index.html": ["general", "ropa-calzado"],   # Boutique Luna es una tienda de ropa
}

def leer(p): return open(R(p), encoding="utf-8").read()

def paquetes():
    out = {}
    for f in sorted(os.listdir(R("novi", "paquetes"))):
        if f.endswith(".json"):
            d = json.loads(leer(os.path.join("novi", "paquetes", f)))
            assert d["nombre"] + ".json" == f, f"El nombre interno de {f} no coincide"
            for q in d["preguntas"]:
                assert q.get("p") and q.get("k") and q.get("r"), f"Pregunta incompleta en {f}: {q}"
            out[d["nombre"]] = d
    return out

def filas_demo(paqs, elegidos):
    """Para las demos se quita la marca [EDITAR: ...] y queda el texto de ejemplo."""
    faq, sin = [], []
    for n in elegidos:
        d = paqs[n]
        for q in d["preguntas"]:
            r = re.sub(r"\[EDITAR:\s*([^\]]*)\]", r"\1", q["r"]).strip()
            faq.append({"pregunta": q["p"], "claves": ", ".join(q["k"]), "respuesta": r, "paquete": n, "activo": "SI"})
        sin += [{"palabra": a, "equivale": b} for a, b in d.get("sinonimos", {}).items()]
    return {"faq": faq, "sin": sin}

def entre(texto, ini, fin, nuevo):
    a, b = texto.find(ini), texto.find(fin)
    assert a > -1 and b > a, f"No encontré los marcadores {ini} / {fin}"
    return texto[:a + len(ini)] + "\n" + nuevo + "\n" + texto[b:]

def main():
    paqs = paquetes()
    js = "\n".join(leer(f"novi/{f}") for f in ("diccionario.js", "motor.js", "novi.js"))
    css = leer("novi/novi.css")
    for destino, elegidos in DESTINOS.items():
        h = leer(destino)
        demo = "const NOVI_DEMO = " + json.dumps(filas_demo(paqs, elegidos), ensure_ascii=False) + ";"
        h = entre(h, "/* NOVI:CSS:INICIO */", "/* NOVI:CSS:FIN */", css)
        h = entre(h, "/* NOVI:JS:INICIO */", "/* NOVI:JS:FIN */", demo + "\n" + js)
        open(R(destino), "w", encoding="utf-8").write(h)
        print("OK", destino, "·", "+".join(elegidos))
    shutil.copyfile(R("base/01-web/index.html"), R("base/01-web/mayorista/index.html"))
    print("OK base/01-web/mayorista/index.html (copia)")

    bib = {n: {"titulo": d["titulo"], "preguntas": [[q["p"], ", ".join(q["k"]), q["r"]] for q in d["preguntas"]], "sinonimos": d.get("sinonimos", {})} for n, d in paqs.items()}
    gs = GS.replace("__LISTA__", ", ".join(f'"{n}"' for n in paqs)).replace("__BIB__", json.dumps(bib, ensure_ascii=False, indent=1))
    open(R("base/02-backend/NoviPaquetes.gs"), "w", encoding="utf-8").write(gs)
    print("OK base/02-backend/NoviPaquetes.gs ·", ", ".join(f"{n} ({len(d['preguntas'])})" for n, d in paqs.items()))

GS = '''/**
 * JB NOVA · Paquetes de preguntas de Novi (USO INTERNO, NO SE DEJA EN EL CLIENTE)
 * Archivo generado por herramientas/armar.py a partir de novi/paquetes/. No editar a mano.
 *
 * Cómo usarlo al instalar un cliente:
 * 1) En el proyecto de Apps Script del cliente: + Archivo > Script, nombre "NoviPaquetes", pegar todo esto.
 * 2) Elegir los paquetes en PAQUETES_ELEGIDOS (siempre "general" + el rubro del cliente).
 * 3) Ejecutar la función cargarPaquetesNovi. Copia las preguntas a la hoja Novi_FAQ y los sinónimos a Novi_Sinonimos.
 *    Se puede ejecutar de nuevo: no duplica lo que ya está.
 * 4) BORRAR este archivo del proyecto del cliente.
 * 5) En la hoja Novi_FAQ, completar lo que dice [EDITAR: ...]. Mientras una respuesta tenga [EDITAR,
 *    Novi no la usa con los clientes.
 *
 * Paquetes disponibles: __LISTA__
 */
const PAQUETES_ELEGIDOS = ["general"];

function cargarPaquetesNovi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const faq = ss.getSheetByName("Novi_FAQ"), sin = ss.getSheetByName("Novi_Sinonimos");
  if (!faq || !sin) throw new Error("Primero ejecutá setup (crea las hojas Novi_FAQ y Novi_Sinonimos).");
  const yaF = {}, yaS = {};
  faq.getDataRange().getValues().slice(1).forEach(function (r) { yaF[String(r[3]) + "|" + String(r[0])] = 1; });
  sin.getDataRange().getValues().slice(1).forEach(function (r) { yaS[String(r[0]).toLowerCase()] = 1; });
  const nf = [], ns = [];
  PAQUETES_ELEGIDOS.forEach(function (n) {
    const p = NOVI_BIBLIOTECA[n];
    if (!p) throw new Error("No existe el paquete: " + n);
    p.preguntas.forEach(function (q) { if (!yaF[n + "|" + q[0]]) { nf.push([q[0], q[1], q[2], n, "SI"]); yaF[n + "|" + q[0]] = 1; } });
    Object.keys(p.sinonimos).forEach(function (a) { if (!yaS[a.toLowerCase()]) { ns.push([a, p.sinonimos[a]]); yaS[a.toLowerCase()] = 1; } });
  });
  if (nf.length) faq.getRange(faq.getLastRow() + 1, 1, nf.length, 5).setValues(nf);
  if (ns.length) sin.getRange(sin.getLastRow() + 1, 1, ns.length, 2).setValues(ns);
  return "Preguntas agregadas: " + nf.length + " · Sinónimos agregados: " + ns.length;
}

const NOVI_BIBLIOTECA = __BIB__;
'''

if __name__ == "__main__":
    sys.exit(main())
