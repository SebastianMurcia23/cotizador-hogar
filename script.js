
(function(){
  document.getElementById('todayTag').textContent = new Date().toLocaleDateString('es-CO', {year:'numeric',month:'long',day:'numeric'});

  const CONFIG = {
    // URL que le entrega Google al desplegar el Apps Script como "Aplicación web"
    WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbyi75gHQKSCKmZLfneZ0FVpsjFlI3pWRLI3ttH9eV1eWpGHt5Zs1CnBXSyNUGhUhR4fAA/exec',
    // Debe ser EXACTAMENTE el mismo valor que puso en SECRET_TOKEN dentro del Apps Script
    SECRET_TOKEN: 'pruebas1234',
    // URL de la hoja de Google Sheets donde caen las cotizaciones (para el botón del Panel AMC)
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/1zBFecbI0IMt53pvDAkcqfg8kw9Vg6BDZ8GUyHQm9TKE/edit?usp=sharing'
  };

  const openSheetBtnEl = document.getElementById('openSheetBtn');
  if(openSheetBtnEl){
    openSheetBtnEl.setAttribute('href', CONFIG.SHEET_URL);
  }

  const COLUMNS = [
    {key:'nombre', label:'Nombre completo'},
    {key:'tipoDoc', label:'Tipo de documento'},
    {key:'numDoc', label:'Número de documento'},
    {key:'fechaNacimiento', label:'Fecha de nacimiento'},
    {key:'ciudadResidencia', label:'Ciudad de residencia'},
    {key:'telefono', label:'Teléfono'},
    {key:'correo', label:'Correo electrónico'},
    {key:'direccion', label:'Dirección del inmueble'},
    {key:'ciudadInmueble', label:'Ciudad del inmueble'},
    {key:'estrato', label:'Estrato'},
    {key:'tipoInmueble', label:'Tipo de inmueble'},
    {key:'usoInmueble', label:'Uso del inmueble'},
    {key:'area', label:'Área construida (m²)'},
    {key:'anioConstruccion', label:'Año de construcción'},
    {key:'material', label:'Material de construcción'},
    {key:'numPisos', label:'N.º de pisos'},
    {key:'conjuntoCerrado', label:'Conjunto cerrado'},
    {key:'valorEdificacion', label:'Valor edificación (COP)'},
    {key:'valorContenidos', label:'Valor contenidos (COP)'},
    {key:'valorEquipos', label:'Valor equipos alto valor (COP)'},
    {key:'seguridad', label:'Sistemas de seguridad'},
    {key:'siniestros', label:'Siniestros últimos 3 años'},
    {key:'detalleSiniestro', label:'Detalle del siniestro'},
    {key:'coberturas', label:'Coberturas de interés'},
    {key:'observaciones', label:'Observaciones'},
    {key:'habeasData', label:'Autorización tratamiento de datos (Ley 1581/2012)'}
  ];

  // ---------- Tabs ----------
  const tabFormBtn = document.getElementById('tabFormBtn');
  const viewForm = document.getElementById('viewForm');
  const viewAdmin = document.getElementById('viewAdmin');

  if(tabFormBtn){
    tabFormBtn.addEventListener('click', () => switchTab('form'));
  }

  function switchTab(which){
    if(which==='form'){
      viewForm.style.display='block'; viewAdmin.style.display='none';
    } else {
      viewAdmin.style.display='block'; viewForm.style.display='none';
    }
  }

  // ---------- Conditional siniestro detail ----------
  document.querySelectorAll('input[name=siniestros]').forEach(r=>{
    r.addEventListener('change', e=>{
      document.getElementById('detalleSiniestroWrap').style.display = e.target.value==='Sí' ? 'block':'none';
    });
  });

  // ---------- Formato de miles en vivo para campos de valor en pesos ----------
  // Convierte "4000000" -> "4.000.000", "400000000" -> "400.000.000", "3000" -> "3.000"
  function formatMiles(digitsOnly){
    if(!digitsOnly) return '';
    return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  document.querySelectorAll('.money-field').forEach(input=>{
    input.addEventListener('input', ()=>{
      const digitsOnly = input.value.replace(/\D/g, '');
      input.value = formatMiles(digitsOnly);
    });
    input.addEventListener('blur', ()=>{
      const digitsOnly = input.value.replace(/\D/g, '');
      input.value = formatMiles(digitsOnly);
    });
  });

  // ---------- Validadores ----------
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function isEmailValid(value){
    return EMAIL_RE.test(value.trim());
  }

  // Teléfono: solo dígitos mientras se escribe, máximo 10.
  const telefonoInput = document.querySelector('input[name=telefono]');
  telefonoInput.addEventListener('input', ()=>{
    telefonoInput.value = telefonoInput.value.replace(/\D/g, '').slice(0, 10);
  });

  // Número de documento: si es Cédula o Cédula de extranjería, solo dígitos.
  const tipoDocSelect = document.querySelector('select[name=tipoDoc]');
  const numDocInput = document.querySelector('input[name=numDoc]');
  numDocInput.addEventListener('input', ()=>{
    if(tipoDocSelect.value.indexOf('Cédula') === 0 || tipoDocSelect.value.indexOf('Cédula') === 1 || tipoDocSelect.value.startsWith('Cédula')){
      numDocInput.value = numDocInput.value.replace(/\D/g, '');
    }
  });

  // ---------- Form submit ----------
  const form = document.getElementById('quoteForm');
  const formError = document.getElementById('formError');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    formError.style.display='none';
    formError.className = 'error-msg';

    // Honeypot anti-spam: si este campo invisible viene lleno, es un bot.
    if(document.getElementById('empresaWeb').value){
      return;
    }

    const requiredFields = {
      nombre: 'Nombre completo',
      tipoDoc: 'Tipo de documento',
      numDoc: 'Número de documento',
      telefono: 'Teléfono / WhatsApp',
      correo: 'Correo electrónico',
      direccion: 'Dirección del inmueble',
      ciudadInmueble: 'Ciudad del inmueble'
    };
    const missingFields = [];
    let firstMissingEl = null;
    for(const f in requiredFields){
      const el = form.elements[f];
      if(!el.value || !el.value.trim()){
        missingFields.push(requiredFields[f]);
        if(!firstMissingEl) firstMissingEl = el;
      }
    }
    if(missingFields.length){
      formError.textContent = 'Faltan los siguientes campos obligatorios: ' + missingFields.join(', ') + '.';
      formError.style.display='block';
      alert('Faltan los siguientes campos obligatorios:\n\n' + missingFields.map(m=>'• '+m).join('\n'));
      if(firstMissingEl) firstMissingEl.focus();
      return;
    }
    const correoEl = form.elements['correo'];
    if(!isEmailValid(correoEl.value)){
      formError.textContent = 'Ingrese un correo electrónico válido, con arroba (@) y dominio. Ejemplo: nombre@correo.com';
      formError.style.display='block';
      correoEl.focus();
      return;
    }

    const telefonoDigits = telefonoInput.value.replace(/\D/g, '');
    if(telefonoDigits.length < 7 || telefonoDigits.length > 10){
      formError.textContent = 'Ingrese un número de teléfono válido (entre 7 y 10 dígitos, solo números).';
      formError.style.display='block';
      telefonoInput.focus();
      return;
    }

    if(!document.getElementById('habeasData').checked){
      formError.textContent = 'Debe autorizar el tratamiento de sus datos personales para poder enviar la solicitud.';
      formError.style.display='block';
      document.getElementById('habeasData').focus();
      return;
    }

    if(CONFIG.WEBAPP_URL.indexOf('PEGUE_AQUI') !== -1){
      formError.textContent = 'El formulario aún no está conectado a un backend. Siga la GUIA_INSTALACION.md para configurar CONFIG.WEBAPP_URL.';
      formError.style.display='block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    const fd = new FormData(form);
    const record = { token: CONFIG.SECRET_TOKEN };
    COLUMNS.forEach(c=>{
      if(c.key==='seguridad' || c.key==='coberturas'){
        record[c.key] = fd.getAll(c.key).join(', ');
      } else if(c.key==='habeasData'){
        record[c.key] = document.getElementById('habeasData').checked ? 'Sí, autorizado' : 'No autorizado';
      } else {
        record[c.key] = (fd.get(c.key) || '').toString().trim();
      }
    });

    try{
      const resp = await fetch(CONFIG.WEBAPP_URL, {
        method: 'POST',
        // text/plain evita que el navegador dispare un preflight OPTIONS,
        // que Google Apps Script no maneja. El servidor igual lo lee como JSON.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(record)
      });

      let data = null;
      try{ data = await resp.json(); }catch(parseErr){ data = null; }

      if(!resp.ok || !data || data.ok !== true){
        throw new Error((data && data.error) ? data.error : 'Respuesta inválida del servidor');
      }

      document.getElementById('refCode').textContent = 'N.º de referencia: ' + (data.refId || '—');
      form.style.display='none';
      document.getElementById('confirmView').style.display='block';
    }catch(err){
      formError.textContent = 'Ocurrió un problema al enviar la solicitud. Verifique su conexión e intente nuevamente, o contáctenos directamente.';
      formError.style.display='block';
      console.error('Error de envío:', err);
    }finally{
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar solicitud';
    }
  });

  document.getElementById('newRequestBtn').addEventListener('click', ()=>{
    form.reset();
    document.getElementById('detalleSiniestroWrap').style.display='none';
    document.getElementById('confirmView').style.display='none';
    form.style.display='block';
  });

})();