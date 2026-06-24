import re

filepath = r'c:\Users\axels\Documents\GitHub\ing-de-software-2\frontend\src\components\ClientPortalShell.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Default state of newOrderForm
content = content.replace(
    'bultos_detalle: [{ alto_cm: "", ancho_cm: "", largo_cm: "", peso_kg: "" }]',
    'bultos_detalle: [{ categoria: "S" }]'
)

# 2. handleAddBulto
content = content.replace(
    'bultos_detalle: [...prev.bultos_detalle, { alto_cm: "", ancho_cm: "", largo_cm: "", peso_kg: "" }]',
    'bultos_detalle: [...prev.bultos_detalle, { categoria: "S" }]'
)

# 3. Form payload
payload_old = '''        bultos_detalle: newOrderForm.bultos_detalle.map(b => ({
          alto_cm: Number(b.alto_cm),
          ancho_cm: Number(b.ancho_cm),
          largo_cm: Number(b.largo_cm),
          peso_kg: Number(b.peso_kg)
        }))'''

payload_new = '''        bultos_detalle: newOrderForm.bultos_detalle.map(b => ({
          alto_cm: 0,
          ancho_cm: 0,
          largo_cm: 0,
          peso_kg: 0,
          categoria: b.categoria || "S"
        }))'''
content = content.replace(payload_old, payload_new)

# 4. Form HTML - Replace the 4 inputs with a single Select
form_old = '''                      <div>
                        <label style={{ fontSize: "11px", color: "#94a3b8" }}>Alto (cm)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          style={stylesObj.input}
                          placeholder="cm"
                          value={b.alto_cm}
                          onChange={(e) => handleChangeBulto(idx, "alto_cm", e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "#94a3b8" }}>Ancho (cm)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          style={stylesObj.input}
                          placeholder="cm"
                          value={b.ancho_cm}
                          onChange={(e) => handleChangeBulto(idx, "ancho_cm", e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "#94a3b8" }}>Largo (cm)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          style={stylesObj.input}
                          placeholder="cm"
                          value={b.largo_cm}
                          onChange={(e) => handleChangeBulto(idx, "largo_cm", e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "#94a3b8" }}>Peso (kg)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          style={stylesObj.input}
                          placeholder="kg"
                          value={b.peso_kg}
                          onChange={(e) => handleChangeBulto(idx, "peso_kg", e.target.value)}
                        />
                      </div>'''

form_new = '''                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: "11px", color: "#94a3b8" }}>Tamaño del Paquete</label>
                        <select
                          value={b.categoria || "S"}
                          onChange={(e) => handleChangeBulto(idx, "categoria", e.target.value)}
                          style={stylesObj.input}
                        >
                          <option value="XS">XS (Pequeño - 1 Slot)</option>
                          <option value="S">S (Mediano - 4 Slots)</option>
                          <option value="M">M (Estándar - 12 Slots)</option>
                          <option value="L">L (Grande - 24 Slots)</option>
                          <option value="XL">XL (Extra Grande - 48 Slots)</option>
                          <option value="MAXIMO">MAXIMO (Máxima Capacidad - 96 Slots)</option>
                        </select>
                      </div>'''

content = content.replace(form_old, form_new)

# 5. Remove the validation loop completely, as we don't have dimensions anymore
# It looks like:
#      let volumenAcumulado = 0;
#      for (let i = 0; i < newOrderForm.bultos_detalle.length; i++) {
# ...
#      if (volumenAcumulado > 25000000) { ... }

validation_regex = r"      let volumenAcumulado = 0;\s*for \(let i = 0; i < newOrderForm\.bultos_detalle\.length; i\+\+\) \{.*?if \(volumenAcumulado > 25000000\) \{.*?return;\s*\}"
content = re.sub(validation_regex, "", content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modifications done!")
