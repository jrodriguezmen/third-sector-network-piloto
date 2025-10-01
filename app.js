// Cargar y mostrar proyectos desde el JSON
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('proyectos_piloto_3sn.json');
        const data = await response.json();
        
        const proyectosList = document.getElementById('proyectos-list');
        
        data.proyectos.forEach(proyecto => {
            const card = document.createElement('div');
            card.className = 'proyecto-card';
            
            card.innerHTML = `
                <h3>${proyecto.nombre}</h3>
                <p><strong>Organización:</strong> ${proyecto.organizacion}</p>
                <p><strong>Descripción:</strong> ${proyecto.descripcion}</p>
                <p><strong>Área:</strong> ${proyecto.area}</p>
                <p><strong>Contacto:</strong> ${proyecto.contacto}</p>
            `;
            
            proyectosList.appendChild(card);
        });
    } catch (error) {
        console.error('Error al cargar proyectos:', error);
        const proyectosList = document.getElementById('proyectos-list');
        proyectosList.innerHTML = '<p>Error al cargar los proyectos. Por favor, inténtalo más tarde.</p>';
    }
});
