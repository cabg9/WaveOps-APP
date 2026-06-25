// Script de diagnostico - verificar valores de la tarea en Firestore
// Abre la consola de Firebase en tu navegador:
// https://console.firebase.google.com/project/wve-b3db5/firestore/data/~2Ftasks
// 
// Busca la tarea "media morada" y verifica estos campos:
// 1. supervisorId - ¿qué valor tiene? (email o ID?)
// 2. status - ¿COMPLETED?
// 3. dueDate - ¿qué fecha tiene?
// 4. createdBy - ¿qué valor tiene?
//
// Luego, inicia sesion como el supervisor y en la consola del navegador ejecuta:
// console.log("user.id:", user?.id);
// console.log("user.email:", user?.email);
//
// Compara: supervisorId === user.id ? debe ser true
