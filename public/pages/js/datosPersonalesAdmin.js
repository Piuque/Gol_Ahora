const userRole = localStorage.getItem("role") || "cliente";
let relativePath = "/cliente/info";
if (userRole === "admin" || userRole === "administrador") {
    relativePath = "/admin/info";
} else if (userRole === "profesor") {
    relativePath = "/profesor/info";
} else if (userRole === "entrenador") {
    relativePath = "/entrenador/info";
}
const API = relativePath;

async function ObtenerDatosPersonales(){
    try{
       const Respuesta = await fetch(API,{
        method : "GET",
        headers : {
            "Content-type":"aplication/JSON",
            "plataform": "web"
        }
       });
       const Datos = await Respuesta.json();
       
        const CampoNombre = document.querySelector('.input-Nombre');
        const CampoApellido = document.querySelector('.input-Apellido');
        const CampoNacionalidad = document.querySelector('.input-Nacionalidad');
        const CampoDni = document.querySelector('.input-Dni');
        const CampoGenero = document.querySelector('.input-Genero');
        const CampoFecha = document.querySelector('.input-Fecha');
        const CampoEmail = document.querySelector('.input-Email');
        const CampoTelefono = document.querySelector('.input-Telefono');
        const CampoDireccion = document.querySelector('.input-Direccion');

        // conecto los campos con mi DB
        CampoNombre.value = Datos.nombre ;
        CampoApellido.value = Datos.apellido;
        CampoNacionalidad.value = Datos.nacionalidad;
        CampoDni.value = Datos.dni;
        CampoGenero.value = Datos.genero;
        CampoTelefono.value = Datos.telefono;
        CampoEmail.value = Datos.email;
        CampoDireccion.value = `${Datos.direccion.calle} ${Datos.direccion.numero}, ${Datos.direccion.localidad}, ${Datos.direccion.pais}`;
    }catch(error){

    };
  
}  ObtenerDatosPersonales();
