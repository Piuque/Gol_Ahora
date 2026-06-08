/* Utilidades compartidas para certificaciones de profesor/entrenador */

function parsearMatriculaCertificacion(matricula) {
    const texto = (matricula || '').trim();
    const match = texto.match(/^(.+?)\s*\((.+)\)\s*$/);
    if (match) {
        return { nombre: match[1].trim(), institucion: match[2].trim() };
    }
    return { nombre: texto || 'Certificación', institucion: '—' };
}

function urlAdjuntoCertificacion(url) {
    if (!url || !String(url).trim()) return null;
    const limpia = String(url).trim();
    if (limpia.startsWith('http://') || limpia.startsWith('https://')) return limpia;
    if (limpia.startsWith('/')) return window.location.origin + limpia;
    return window.location.origin + '/' + limpia;
}

function badgeEstadoCertificacion(validada) {
    if (validada === true || validada === 'true' || validada === 1) {
        return '<span style="display:inline-block;background:rgba(0,193,110,0.12);border:1px solid rgba(0,193,110,0.35);border-radius:4px;padding:3px 8px;font-size:0.7rem;color:#00C16E;">Validada</span>';
    }
    return '<span style="display:inline-block;background:rgba(255,193,7,0.08);border:1px solid rgba(255,193,7,0.25);border-radius:4px;padding:3px 8px;font-size:0.7rem;color:#ffc107;">Pendiente</span>';
}

window.verAdjuntoCertificacion = function(url, titulo) {
    const urlFinal = urlAdjuntoCertificacion(url);
    if (!urlFinal) {
        Swal.fire({ icon: 'info', title: 'Sin adjunto', text: 'Esta certificación no tiene archivo asociado.', confirmButtonColor: '#00C16E' });
        return;
    }

    const esPdf = /\.pdf$/i.test(urlFinal);
    const esImagen = /\.(png|jpe?g|gif|webp)$/i.test(urlFinal);

    let contenido = '';
    if (esImagen) {
        contenido = `<div style="text-align:center;"><img src="${urlFinal}" alt="Certificación" style="max-width:100%;max-height:65vh;border-radius:8px;"></div>`;
    } else if (esPdf) {
        contenido = `<iframe src="${urlFinal}" style="width:100%;height:65vh;border:none;border-radius:8px;background:#fff;"></iframe>`;
    } else {
        contenido = `<p style="font-size:0.85rem;color:rgba(255,255,255,0.65);">No se puede previsualizar este formato en el navegador.</p>`;
    }

    Swal.fire({
        background: '#0A2540',
        color: '#fff',
        width: esPdf || esImagen ? '720px' : '480px',
        title: titulo || 'Certificación adjunta',
        html: contenido + (esPdf || esImagen ? '' : `<a href="${urlFinal}" target="_blank" rel="noopener" style="color:#00C16E;font-weight:600;">Abrir archivo en nueva pestaña</a>`),
        showConfirmButton: true,
        confirmButtonColor: '#00C16E',
        confirmButtonText: 'Cerrar',
        showCloseButton: true
    });
};

function renderizarCardCertificacion(c, colorAccent = '#00C16E') {
    const parsed = c.nombre && c.institucion && c.institucion !== 'Establecimiento'
        ? { nombre: c.nombre, institucion: c.institucion }
        : parsearMatriculaCertificacion(c.nombre || c.matricula);
    const fecha = c.fecha_emision || c.fecha_caducidad || '—';
    const urlAdj = c.archivo_url || c.link_archivo || '';

    return `
        <div class="col-md-6 col-xl-4">
            <div class="card card-sport h-100 p-3 d-flex flex-column justify-content-between">
                <div>
                    <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                        <h6 class="fw-bold text-white mb-0" style="flex:1;min-width:0;word-break:break-word;">${parsed.nombre}</h6>
                        ${badgeEstadoCertificacion(c.validada)}
                    </div>
                    <p class="small text-light-75 mb-1">
                        <i class="fa-solid fa-building-columns text-sports me-1"></i>${parsed.institucion}
                    </p>
                    <small style="color:var(--text-light-50)">
                        <i class="fa-regular fa-calendar me-1"></i>Vencimiento: ${fecha}
                    </small>
                </div>
                ${urlAdj ? `
                    <div class="mt-3">
                        <button type="button" onclick=""
                            class="btn btn-xs btn-outline-success border-sports text-sports w-100">
                            <i class="fa-solid fa-file-pdf me-1"></i>Ver adjunto
                        </button>
                    </div>` : `
                    <div class="mt-3">
                        <span class="badge bg-secondary w-100 py-2">Sin archivo adjunto</span>
                    </div>`}
            </div>
        </div>`;
}
