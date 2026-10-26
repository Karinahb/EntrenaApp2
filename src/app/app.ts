import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
  } from 'firebase/auth';

interface Sesion {
  id?: string;
  alumnoId: string;
  alumnoNombre: string;
  fecha: string;
  ejercicios: string;
}
interface Alumno {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol:string;
}

interface RegistroEntrenamiento {
  id?: string;
  alumnoId: string;
  alumnoNombre: string;
  fecha: string;
  inicio: string;
  fin: string;
  duracionMinutos: number;
}

const firebaseConfig = {
  apiKey: "AIzaSyAlZfI9QWitBrdUL-BoRpX-np8NVd1bz8Y",
  authDomain: "entranaapp-2f92a.firebaseapp.com",
  projectId: "entranaapp-2f92a",
  storageBucket: "entranaapp-2f92a.firebasestorage.app",
  messagingSenderId: "419712135056",
  appId: "1:419712135056:web:f476d7789dec2381918d15",
  measurementId: "G-0Z3EE314ST"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  rolActual: string = 'anonimo'; 
  mensaje = '';
  tipoMensaje: 'success' | 'error' | 'info' = 'info';
  
  // Inyectamos el detector de cambios de Angular
  private cdr = inject(ChangeDetectorRef);

  // Gestión de Alumnos
  nombreNuevoAlumno = '';
  alumnos: Alumno[] = [];
  emailAlumno = '';
  modoEdicionAlumno = false;
  idAlumnoEnEdicion = '';
  passwordAlumno = '';

  // Gestión de Rutinas
  idAlumnoSeleccionado = '';
  nuevaFecha = '';
  nuevosEjercicios = '';
  entrenamientoActivo = false;
  horaInicio = '';
  fechaInicio = '';
  
  // Variables de Edición
  modoEdicion = false;
  idSesionEnEdicion = '';

  todasLasSesiones: Sesion[] = [];
  sesionesDelAlumnoActual: Sesion[] = [];

  //variables de inicio de sesion
  email = '';
  password = '';
  usuarioActual: any = null;

  ngOnInit() {
    this.cargarAlumnosDesdeNube();
    this.cargarSesionesDesdeNube();
  }

  mostrarMensaje(
      texto: string,
      tipo: 'success' | 'error' | 'info'
    ) {  
      this.mensaje = texto;
      this.tipoMensaje = tipo;  
      setTimeout(() => {
        this.mensaje = '';
      }, 4000);
    
    }
  iniciarEntrenamiento() {
    const ahora = new Date();
      this.fechaInicio = ahora.toISOString().split('T')[0];  
    this.horaInicio =
      ahora.toLocaleTimeString(
        'es-CL',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      );  
    this.entrenamientoActivo = true;  
  }

  async finalizarEntrenamiento() {
    try {  
      const ahora = new Date();  
      const horaFin = ahora.toLocaleTimeString('es-CL',{hour: '2-digit',minute: '2-digit'});  
      const [inicioHora, inicioMinuto] = this.horaInicio.split(':').map(Number);  
      const inicio = new Date();
      inicio.setHours(inicioHora);
      inicio.setMinutes(inicioMinuto);
      inicio.setSeconds(0);
  
      const diferencia = Math.round((ahora.getTime() - inicio.getTime()) / 60000);  
      const alumno = this.alumnos.find(a => a.id === this.rolActual);  
      await addDoc(collection(db, 'entrenamientos_realizados'),
        {
          alumnoId: this.rolActual,
          alumnoNombre: alumno?.nombre || '',
          fecha: this.fechaInicio,
          inicio: this.horaInicio,
          fin: horaFin,
          duracionMinutos: diferencia
        }
      );  
      this.mostrarMensaje(
        `✅ Entrenamiento finalizado. Duración: ${diferencia} minutos`,
        'success'
      );
      
      this.entrenamientoActivo = false;
      this.horaInicio = '';
      this.fechaInicio = '';  
    } catch {  
      this.mostrarMensaje(
        'Error al guardar entrenamiento',
        'error'
      );
    }  
  }

  cargarAlumnosDesdeNube() {

    onSnapshot(
      collection(db, 'alumnos'),
      (snapshot) => {
  
        this.alumnos = snapshot.docs.map(
          doc => ({
            id: doc.id,
            nombre: doc.data()['nombre'],
            email: doc.data()['email'],
            password: doc.data()['password'],
            rol:doc.data()['rol']
          })
        ) as Alumno[];
  
        this.cdr.detectChanges();
  
      }
    );
  
  }

  async guardarAlumno() {

    if (
      !this.nombreNuevoAlumno.trim() ||
      !this.emailAlumno.trim() ||
      !this.passwordAlumno.trim()
    ) {
  
      this.mostrarMensaje(
        'Complete todos los campos',
        'info'
      );
  
      return;
    }
  
    try {
  
      if (this.modoEdicionAlumno) {
  
        await updateDoc(
          doc(
            db,
            'alumnos',
            this.idAlumnoEnEdicion
          ),
          {
            nombre: this.nombreNuevoAlumno,
            email: this.emailAlumno
          }
        );
  
        this.cancelarEdicionAlumno();
  
        this.mostrarMensaje(
          'Alumno actualizado correctamente',
          'success'
        );
  
      } else {
  
        await addDoc(
          collection(db, 'alumnos'),
          {
            nombre: this.nombreNuevoAlumno,
            email: this.emailAlumno,
            password: this.passwordAlumno
          }
        );
  
        this.nombreNuevoAlumno = '';
        this.emailAlumno = '';
        this.passwordAlumno = '';
  
        this.mostrarMensaje(
          'Alumno creado correctamente',
          'success'
        );
  
      }
  
    } catch {
  
      this.mostrarMensaje(
        'Error al guardar alumno',
        'error'
      );
  
    }
  
  }
 
  editarAlumno(alumno: Alumno) {
    this.modoEdicionAlumno = true;
      this.idAlumnoEnEdicion = alumno.id;  
    this.nombreNuevoAlumno = alumno.nombre;  
    this.emailAlumno = alumno.email || '';  
  }

  cargarSesionesDesdeNube() {
    const consultaOrdenada = query(collection(db, 'sesiones_entrenamiento'), orderBy('fecha', 'desc'));
    onSnapshot(consultaOrdenada, (snapshot) => {
      this.todasLasSesiones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sesion[];
      
      this.filtrarSesionesAlumno();
      // Forzar a Angular a redibujar el historial y las tarjetas al instante
      this.cdr.detectChanges();
    });
  }

  cancelarEdicionAlumno() {
    this.modoEdicionAlumno = false;  
    this.idAlumnoEnEdicion = '';  
    this.nombreNuevoAlumno = '';  
    this.emailAlumno = '';  
  }

  async guardarSesion() {
    if (!this.idAlumnoSeleccionado || !this.nuevaFecha || !this.nuevosEjercicios) {
      this.mostrarMensaje(
        'Por favor, rellena todos los campos',
        'info'
      );
      return;
    }

    if (this.modoEdicion) {
      try {
        const docRef = doc(db, 'sesiones_entrenamiento', this.idSesionEnEdicion);
        await updateDoc(docRef, {
          fecha: this.nuevaFecha,
          ejercicios: this.nuevosEjercicios
        });
        this.cancelarEdicion();
      } catch (error) {
        this.mostrarMensaje(
          'Error al actualizar',
          'error'
        );
      }
    } else {
      // BUSQUEDA CORRECTA: Buscamos el alumno seleccionado para capturar su nombre exacto
      const alumno = this.alumnos.find(a => a.id === this.idAlumnoSeleccionado);
      
      const nuevaSesion: Sesion = {
        alumnoId: this.idAlumnoSeleccionado, // Guardamos el ID automático de Firebase
        alumnoNombre: alumno ? alumno.nombre : 'Desconocido',
        fecha: this.nuevaFecha,
        ejercicios: this.nuevosEjercicios
      };

      try {
        const coleccionRef = collection(db, 'sesiones_entrenamiento');
        await addDoc(coleccionRef, nuevaSesion);
        
        // Limpiamos los campos del formulario
        this.nuevaFecha = '';
        this.nuevosEjercicios = '';
        this.mostrarMensaje(
          '🏋️ Entrenamiento asignado correctamente',
          'success'
        );
      } catch (error) {

        this.mostrarMensaje(
          'Error al guardar en la nube',
          'error'
        );
      }
    }
  }

  cambiarUsuario(nuevoRol: string) {
    this.rolActual = nuevoRol;
    this.filtrarSesionesAlumno();
  }

  filtrarSesionesAlumno() {
    // FILTRO PERFECTO: Comparamos el ID del usuario logueado con el alumnoId de la rutina
    this.sesionesDelAlumnoActual = this.todasLasSesiones.filter(s => s.alumnoId === this.rolActual);
    this.cdr.detectChanges(); // Le obligamos a Angular a pintar las rutinas del alumno en pantalla
  }


  activarModoEdicion(sesion: Sesion) {
    this.modoEdicion = true;
    this.idSesionEnEdicion = sesion.id || '';
    this.idAlumnoSeleccionado = sesion.alumnoId;
    this.nuevaFecha = sesion.fecha;
    this.nuevosEjercicios = sesion.ejercicios;
    this.cdr.detectChanges();
  }

  cancelarEdicion() {
    this.modoEdicion = false;
    this.idSesionEnEdicion = '';
    this.idAlumnoSeleccionado = '';
    this.nuevaFecha = '';
    this.nuevosEjercicios = '';
    this.cdr.detectChanges();
  }

  async eliminarSesion(id?: string) {
    if (id && confirm('¿Estás seguro de que quieres eliminar esta rutina?')) {
      try {
        await deleteDoc(doc(db, 'sesiones_entrenamiento', id));
      } catch (error) {     
        this.mostrarMensaje(
          'Error al borrar la rutina',
          'error'
        );
      }
    }
  }

  idUsuarioALaVista(id: string): string {
    if (id === 'entrenador') return 'Entrenador Principal';
    const alumno = this.alumnos.find(a => a.id === id);
    return alumno ? `${alumno.nombre} (Alumno)` : 'Usuario';
  }



  async login() {

    if (!this.email || !this.password) {
  
      this.mostrarMensaje(
        'Ingrese correo y contraseña',
        'info'
      );
  
      return;
    }
  
    const usuario = this.alumnos.find(
      a =>
        a.email.trim().toLowerCase() ===
        this.email.trim().toLowerCase() &&
        a.password.trim() ===
        this.password.trim()
    );
    if (!usuario) {
  
      this.mostrarMensaje(
        'Correo o contraseña incorrectos',
        'error'
      );
  
      return;
    }
    console.log('Usuario encontrado:', usuario);
  
    if (usuario.rol === 'entrenador') {
   
      this.rolActual = 'entrenador';
  
    } else {
  
      this.rolActual = usuario.id;
      this.filtrarSesionesAlumno();
  
    }
  
    this.mostrarMensaje(
      `Bienvenido ${usuario.nombre}`,
      'success'
    );
  
  }
  

  cerrarSesion() {
    this.rolActual = 'anonimo';
    this.sesionesDelAlumnoActual = [];
    this.cdr.detectChanges();
  }

  async eliminarAlumno(id: string) {
    if (!confirm('¿Eliminar alumno?')) return;  
    try {  
      await deleteDoc(doc(db, 'alumnos', id));  
    } catch (error) {  
      this.mostrarMensaje(
        'Error al eliminar alumno',
        'error'
      );
    }  
  }
}