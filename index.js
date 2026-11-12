// ==========================================
// CONFIGURACIÓN PRINCIPAL Y SUPABASE
// ==========================================
const NUMERO_WHATSAPP = "56951681896"; 

const SUPABASE_URL = 'https://gjtwlmpucylosttexfdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdHdsbXB1Y3lsb3N0dGV4ZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNDQ3MTgsImV4cCI6MjEwOTgyMDcxOH0.3IJ60M0T5_U-xTt4JCmXkwDy61yDOAEjqUISoRA4GV0';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables de Estado
let productosGlobales = [];
let promocionesGlobales = [];
let marcaSeleccionada = "Todas";
let categoriaSeleccionada = "Todas";
let indexPromo = 0;

// ==========================================
// OBTENER DATOS DESDE SUPABASE
// ==========================================
async function obtenerProductosSupabase() {
  try {
    const { data, error } = await _supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    productosGlobales = data || [];
    aplicarFiltrosCombinados();
  } catch (err) {
    console.error('Error al obtener productos:', err);
  }
}

async function obtenerPromosSupabase() {
  try {
    const { data, error } = await _supabase
      .from('promociones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    promocionesGlobales = data || [];
    renderizarCarrusel();
  } catch (err) {
    console.error('Error al obtener promociones:', err);
  }
}

// Cargar logos de marcas desde Supabase para el carrusel inferior (CORREGIDO Y AMPLIFICADO)
async function obtenerMarcasSupabase() {
  const secCarrusel = document.getElementById('sec-carrusel-marcas');
  const tanda1 = document.getElementById('carrusel-marcas-tanda1');
  const tanda2 = document.getElementById('carrusel-marcas-tanda2');

  try {
    const { data: marcas, error } = await _supabase
      .from('marcas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!marcas || marcas.length === 0) {
      if (secCarrusel) secCarrusel.classList.add('hidden');
      return;
    }

    if (secCarrusel) secCarrusel.classList.remove('hidden');

    let htmlLogos = '';
    marcas.forEach(m => {
      htmlLogos += `
        <div class="flex items-center justify-center p-3 bg-white/5 rounded-2xl border border-zinc-800 shadow-sm hover:border-zinc-600 hover:scale-110 transition duration-300">
          <img src="${m.imagen}" alt="${m.nombre}" title="${m.nombre}" class="h-16 sm:h-20 w-32 sm:w-40 object-contain">
        </div>
      `;
    });

    if (tanda1) tanda1.innerHTML = htmlLogos;
    if (tanda2) tanda2.innerHTML = htmlLogos; // Repetido para que el ciclo sea infinito sin cortes

  } catch (err) {
    console.error('Error al obtener marcas:', err);
  }
}

// ==========================================
// ROTACIÓN AUTOMÁTICA DE PROMOS
// ==========================================
function renderizarCarrusel() {
  const contenedorSlides = document.getElementById('carrusel-slides');
  if (!contenedorSlides) return;

  contenedorSlides.innerHTML = '';

  if (!promocionesGlobales || promocionesGlobales.length === 0) {
    contenedorSlides.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full bg-zinc-900 text-zinc-400 text-xs text-center p-4">
        <i class="fa-solid fa-image text-2xl mb-2 text-zinc-600"></i>
        <p>No hay promociones activas.</p>
        <p class="text-[10px] text-zinc-500">Agrega un banner desde el panel de administración.</p>
      </div>
    `;
    return;
  }

  if (indexPromo >= promocionesGlobales.length) {
    indexPromo = 0;
  }

  promocionesGlobales.forEach((promo, idx) => {
    const esActivo = idx === indexPromo ? 'opacity-100 z-10' : 'opacity-0 z-0';
    contenedorSlides.innerHTML += `
      <div class="absolute inset-0 transition-opacity duration-1000 ease-in-out ${esActivo} flex items-center justify-between bg-black">
        
        <!-- Afiche/Imagen subida con escalado automático -->
        <div class="w-full h-full flex items-center justify-center p-2">
          <img src="${promo.imagen}" alt="${promo.titulo}" class="max-h-full max-w-full object-contain rounded-xl">
        </div>
        
        <!-- Información promocional -->
        <div class="relative z-10 p-6 sm:p-8 max-w-xs shrink-0 flex flex-col justify-center">
          <span class="bg-white text-black text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider w-fit">${promo.tag}</span>
          <h2 class="text-xl sm:text-2xl font-extrabold text-white mt-2 leading-tight">${promo.titulo}</h2>
          <p class="text-zinc-400 text-xs mt-1">${promo.descripcion || ''}</p>
          <button 
            onclick="consultarProducto('Promoción: ${promo.titulo}')" 
            class="mt-3 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-2 shadow-lg hover:scale-105"
          >
            <i class="fa-brands fa-whatsapp text-sm"></i> ${promo.boton}
          </button>
        </div>

      </div>
    `;
  });
}

function iniciarRotacionAutomatica() {
  setInterval(() => {
    if (promocionesGlobales && promocionesGlobales.length > 0) {
      indexPromo = (indexPromo + 1) % promocionesGlobales.length;
      renderizarCarrusel();
    }
  }, 4000);
}

// ==========================================
// LÓGICA DEL CATÁLOGO Y FILTROS
// ==========================================
function cargarProductos(lista) {
  const contenedor = document.getElementById('grid-productos');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `<p class="col-span-full text-center text-zinc-500 py-12">No se encontraron repuestos para esta selección.</p>`;
    return;
  }

  lista.forEach(prod => {
    contenedor.innerHTML += `
      <div class="card-producto bg-white rounded-xl shadow-sm hover:shadow-md border border-zinc-200 overflow-hidden flex flex-col justify-between">
        <img src="${prod.imagen}" alt="${prod.nombre}" class="w-full h-48 object-cover bg-zinc-100">
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <span class="text-[10px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">${prod.codigo}</span>
            <h4 class="font-bold text-zinc-900 text-base mt-2">${prod.nombre}</h4>
            <p class="text-zinc-500 text-xs mt-1">${prod.compatibilidad || ''}</p>
          </div>
          <div class="mt-4 pt-3 border-t border-zinc-100 flex justify-end items-center">
            <button 
              onclick="consultarProducto('${prod.nombre} (${prod.codigo})')" 
              class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition"
            >
              <i class="fa-brands fa-whatsapp text-sm"></i> Cotizar por WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;
  });
}

function filtrarPorCategoria(cat, elemento) {
  categoriaSeleccionada = cat;
  
  const botones = document.querySelectorAll('.btn-categoria');
  botones.forEach(btn => {
    btn.classList.remove('bg-black', 'text-white');
    btn.classList.add('bg-zinc-100', 'text-zinc-800');
  });

  if (elemento) {
    elemento.classList.remove('bg-zinc-100', 'text-zinc-800');
    elemento.classList.add('bg-black', 'text-white');
  }

  aplicarFiltrosCombinados();
}

function filtrarPorMarca(marca, elemento) {
  marcaSeleccionada = marca;
  
  const botones = document.querySelectorAll('.btn-filtro-marca');
  botones.forEach(btn => {
    btn.classList.remove('bg-black', 'text-white');
    btn.classList.add('bg-zinc-100', 'text-zinc-800');
  });

  if (elemento) {
    elemento.classList.remove('bg-zinc-100', 'text-zinc-800');
    elemento.classList.add('bg-black', 'text-white');
  }

  aplicarFiltrosCombinados();
}

function limpiarTodosFiltros() {
  const buscador = document.getElementById('input-buscador');
  if (buscador) buscador.value = '';
  filtrarPorCategoria('Todas', document.querySelectorAll('.btn-categoria')[0]);
  filtrarPorMarca('Todas', document.querySelectorAll('.btn-filtro-marca')[0]);
}

function aplicarFiltrosCombinados() {
  const buscador = document.getElementById('input-buscador');
  const texto = buscador ? buscador.value.toLowerCase() : '';

  const filtrados = productosGlobales.filter(p => {
    const coincideTexto = p.nombre.toLowerCase().includes(texto) ||
                          p.codigo.toLowerCase().includes(texto) ||
                          (p.compatibilidad && p.compatibilidad.toLowerCase().includes(texto));

    const coincideMarca = (marcaSeleccionada === "Todas") || 
                          p.marca.toLowerCase() === marcaSeleccionada.toLowerCase() ||
                          (p.compatibilidad && p.compatibilidad.toLowerCase().includes(marcaSeleccionada.toLowerCase()));

    const coincideCat = (categoriaSeleccionada === "Todas") || 
                         p.categoria.toLowerCase() === categoriaSeleccionada.toLowerCase();

    return coincideTexto && coincideMarca && coincideCat;
  });

  cargarProductos(filtrados);
}

function consultarProducto(nombreProducto) {
  const mensaje = encodeURIComponent(`Hola Repuestos CGS! Me interesa consultar por: ${nombreProducto}`);
  window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${mensaje}`, '_blank');
}

// INICIALIZACIÓN CON SUPABASE
document.addEventListener('DOMContentLoaded', () => {
  obtenerPromosSupabase();
  obtenerProductosSupabase();
  obtenerMarcasSupabase(); // <--- Carga marcas para el carrusel inferior
  iniciarRotacionAutomatica();

  const buscador = document.getElementById('input-buscador');
  if (buscador) {
    buscador.addEventListener('keyup', aplicarFiltrosCombinados);
  }

  const msgGeneral = encodeURIComponent('Hola Repuestos CGS! Quisiera hacer una consulta general sobre un repuesto.');
  
  const btnWaFlotante = document.getElementById('btn-wa-flotante');
  if (btnWaFlotante) btnWaFlotante.href = `https://wa.me/${NUMERO_WHATSAPP}?text=${msgGeneral}`;
  
  const btnHeaderWa = document.getElementById('btn-header-wa');
  if (btnHeaderWa) btnHeaderWa.href = `https://wa.me/${NUMERO_WHATSAPP}?text=${msgGeneral}`;
});