document.addEventListener('DOMContentLoaded', () => {
    // State management
    let ultimoResumen = {};

    // --- DOM Elements ---
    const form = document.getElementById('calculator-form');
    const modoRadios = document.querySelectorAll('input[name="modo"]');
    const modoCantidadFields = document.getElementById('modo-cantidad-fields');
    const modoTelaFields = document.getElementById('modo-tela-fields');

    const btnCalcularCostos = document.getElementById('btn-calcular-costos');
    const btnLimpiarCostos = document.getElementById('btn-limpiar-costos');
    const btnGuardarTxt = document.getElementById('btn-guardar-txt');

    // --- Utility Functions ---
    const formatNumber = (n) => (n % 1 === 0 ? parseInt(n) : n.toFixed(2));
    const cmToMStr = (cm) => `${formatNumber(cm)} cm (${(cm / 100).toFixed(2)} m)`;

    // --- Core Calculation Logic ---
    function calcularTelaPorCantidad(anchoTelaCm, anchoMoldeCm, altoMoldeCm, margenCosturaCm, desperdicioPct, cantidad, dobleMolde) {
        if (dobleMolde) cantidad *= 2;

        const anchoTotal = anchoMoldeCm + 2 * margenCosturaCm;
        const altoTotal = altoMoldeCm + 2 * margenCosturaCm;

        if (anchoTotal <= 0 || altoTotal <= 0) return { error: "Dimensiones o margen inválidos." };
        if (anchoTotal > anchoTelaCm) return { error: "El ancho total del molde supera el ancho de la tela." };

        const moldesPorFila = Math.floor(anchoTelaCm / anchoTotal);
        if (moldesPorFila <= 0) return { error: "No entra ningún molde por fila." };

        const filasNecesarias = Math.ceil(cantidad / moldesPorFila);
        const largoSinDesperdicio = filasNecesarias * altoTotal;
        const largoConDesperdicio = largoSinDesperdicio * (1 + desperdicioPct / 100);

        return {
            modo: "Calcular tela según cantidad",
            ancho_tela_cm: anchoTelaCm,
            ancho_molde_cm: anchoMoldeCm,
            alto_molde_cm: altoMoldeCm,
            margen_costura_cm_por_lado: margenCosturaCm,
            ancho_molde_total_cm: anchoTotal,
            alto_molde_total_cm: altoTotal,
            moldes_por_fila: moldesPorFila,
            filas_necesarias: filasNecesarias,
            cantidad_solicitada: cantidad,
            doble_molde: dobleMolde,
            largo_total_con_desperdicio_cm: largoConDesperdicio
        };
    }

    function calcularMoldesConTela(anchoTelaCm, anchoMoldeCm, altoMoldeCm, margenCosturaCm, desperdicioPct, largoTelaDisponibleCm) {
        const anchoTotal = anchoMoldeCm + 2 * margenCosturaCm;
        const altoTotal = altoMoldeCm + 2 * margenCosturaCm;

        if (anchoTotal <= 0 || altoTotal <= 0) return { error: "Dimensiones o margen inválidos." };
        if (anchoTotal > anchoTelaCm) return { error: "El ancho total del molde supera el ancho de la tela." };

        const moldesPorFila = Math.floor(anchoTelaCm / anchoTotal);
        if (moldesPorFila <= 0) return { error: "No entra ningún molde por fila." };

        const largoUtilizable = largoTelaDisponibleCm / (1 + desperdicioPct / 100);
        const filasPosibles = Math.floor(largoUtilizable / altoTotal);
        const totalMoldes = moldesPorFila * filasPosibles;

        return {
            modo: "Calcular moldes con tela disponible",
            largo_tela_disponible_cm: largoTelaDisponibleCm,
            total_moldes_obtenibles: totalMoldes
        };
    }

    function calcularCostos(largoTelaCm, precioPorMetro) {
        const precioPorCm = precioPorMetro / 100.0;
        const costoTotal = precioPorCm * largoTelaCm;
        const cantidad = ultimoResumen.cantidad_solicitada || ultimoResumen.total_moldes_obtenibles;
        const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;

        return {
            precio_por_metro: precioPorMetro,
            costo_total: costoTotal,
            costo_unitario: costoUnitario
        };
    }

    // --- UI Update Functions ---
    function mostrarResumenRapido(res) {
        const container = document.getElementById('resumen-rapido');
        if (res.error) {
            container.innerHTML = `<p style="color: red;">${res.error}</p>`;
            return;
        }

        let html = `<strong>Modo:</strong> ${res.modo}<br>`;
        if (res.modo === "Calcular tela según cantidad") {
            html += `<strong>Largo total necesario:</strong> ${cmToMStr(res.largo_total_con_desperdicio_cm)}<br>`;
            html += `<strong>Moldes por fila:</strong> ${res.moldes_por_fila}<br>`;
        } else {
            html += `<strong>Total de moldes obtenibles:</strong> ${res.total_moldes_obtenibles}<br>`;
        }
        container.innerHTML = html;
    }

     function mostrarResumenCostos(costos) {
        const container = document.getElementById('resumen-costos');
        container.innerHTML = `
            <strong>Precio por metro:</strong> $${formatNumber(costos.precio_por_metro)}<br>
            <strong>Costo Total:</strong> $${formatNumber(costos.costo_total)}<br>
            <strong>Costo Unitario:</strong> $${costos.costo_unitario.toFixed(2)}
        `;
    }

    function actualizarTablaFinal() {
        const container = document.getElementById('resumen-final-tabla');
        const labels = {
            modo: "Modo de cálculo",
            ancho_tela_cm: "Ancho de tela (cm)",
            ancho_molde_cm: "Ancho del molde (cm)",
            alto_molde_cm: "Alto del molde (cm)",
            margen_costura_cm_por_lado: "Margen de costura (cm)",
            doble_molde: "Molde doble",
            cantidad_solicitada: "Cantidad solicitada",
            largo_total_con_desperdicio_cm: "Largo total necesario",
            largo_tela_disponible_cm: "Largo de tela disponible",
            total_moldes_obtenibles: "Total moldes obtenibles",
            precio_por_metro: "Precio por metro",
            costo_total: "Costo total",
            costo_unitario: "Costo unitario"
        };

        let tableHtml = '<table>';
        for (const [key, value] of Object.entries(ultimoResumen)) {
            const label = labels[key] || key;
            let displayValue = value;
            if (key === 'doble_molde') displayValue = value ? 'Requiere' : 'No requiere';
            if (typeof value === 'number' && key.includes('cm')) displayValue = cmToMStr(value);
            else if (typeof value === 'number') displayValue = formatNumber(value);

            tableHtml += `<tr><td><strong>${label}</strong></td><td>${displayValue}</td></tr>`;
        }
        tableHtml += '</table>';
        container.innerHTML = tableHtml;
    }


    // --- Event Handlers ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const modo = data.get('modo');

        const anchoTela = parseFloat(document.getElementById('ancho_tela_cm').value);
        const anchoMolde = parseFloat(document.getElementById('ancho_molde_cm').value);
        const altoMolde = parseFloat(document.getElementById('alto_molde_cm').value);
        const margen = parseFloat(document.getElementById('margen_costura_cm').value) || 0;
        const desperdicio = parseFloat(document.getElementById('desperdicio_pct').value) || 0;

        let res;
        if (modo === 'cantidad') {
            const cantidad = parseInt(document.getElementById('cantidad').value);
            const doble = document.getElementById('doble_molde').checked;
            res = calcularTelaPorCantidad(anchoTela, anchoMolde, altoMolde, margen, desperdicio, cantidad, doble);
        } else {
            const largoDisponible = parseFloat(document.getElementById('largo_tela_disponible_cm').value);
            res = calcularMoldesConTela(anchoTela, anchoMolde, altoMolde, margen, desperdicio, largoDisponible);
        }

        ultimoResumen = res;
        mostrarResumenRapido(res);
        actualizarTablaFinal();
    });

    form.addEventListener('reset', () => {
        ultimoResumen = {};
        document.getElementById('resumen-rapido').innerHTML = '<p>Los resultados de tu cálculo aparecerán aquí.</p>';
        document.getElementById('resumen-final-tabla').innerHTML = '<p>Aquí verás la tabla completa para guardar.</p>';
        document.getElementById('resumen-costos').innerHTML = '<p>El desglose de costos aparecerá aquí.</p>';
        document.getElementById('precio_metro').value = '';
    });

    btnCalcularCostos.addEventListener('click', () => {
        const precioMetro = parseFloat(document.getElementById('precio_metro').value);
        if (!precioMetro || !ultimoResumen.largo_total_con_desperdicio_cm) {
            alert("Por favor, ingresa un precio y realiza un cálculo de tela primero.");
            return;
        }
        const costos = calcularCostos(ultimoResumen.largo_total_con_desperdicio_cm, precioMetro);
        Object.assign(ultimoResumen, costos);
        mostrarResumenCostos(costos);
        actualizarTablaFinal();
    });

    btnLimpiarCostos.addEventListener('click', () => {
        document.getElementById('precio_metro').value = '';
        document.getElementById('resumen-costos').innerHTML = '<p>El desglose de costos aparecerá aquí.</p>';
        delete ultimoResumen.precio_por_metro;
        delete ultimoResumen.costo_total;
        delete ultimoResumen.costo_unitario;
        actualizarTablaFinal();
    });

    btnGuardarTxt.addEventListener('click', () => {
        let content = "Resumen de Cálculo de Tela\n============================\n\n";
        const table = document.querySelector('#resumen-final-tabla table');
        if (table) {
            table.querySelectorAll('tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                content += `${cells[0].innerText}: ${cells[1].innerText}\n`;
            });
        }
        const notas = document.getElementById('notas').value;
        if (notas) {
            content += `\nNotas:\n${notas}`;
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `calculo-tela-${new Date().toISOString().slice(0,10)}.txt`;
        link.click();
    });

    modoRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'cantidad') {
                modoCantidadFields.style.display = 'block';
                modoTelaFields.style.display = 'none';
            } else {
                modoCantidadFields.style.display = 'none';
                modoTelaFields.style.display = 'block';
            }
        });
    });
});

// Tab switching logic
function openTab(evt, tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = "none";
    }

    const tabLinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].className = tabLinks[i].className.replace(" active", "");
    }

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}
