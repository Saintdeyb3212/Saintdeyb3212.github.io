// NUEVOS ELEMENTOS
const botonPortada = document.getElementById('botonPortada');
const portada = document.getElementById('portada');
const sorpresaContainer = document.getElementById('sorpresaContainer');
const audio = document.getElementById('musica');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');


let W, H;
let targetPoints = [];
let fireworks = [];
let particles = [];

// --- CONFIGURACIÓN BASE ---
const TARGET_TEXT = "Ponte hermosa otra vez baby, que el martes te llevo a comer."; 
const TWO_PI = Math.PI * 2; 
const PARTICLE_DENSITY = 3; // Densidad alta para buena definición
const EXPLOSION_COUNT = 130; 
const USE_CIRCLES = true; 

// Esta función se encarga de calcular todo según el tamaño de pantalla actual
function resizeCanvas() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    
    // Al redimensionar, recalculamos los puntos del texto
    // para que se ajusten al nuevo tamaño sin deformarse.
    if (startButton.classList.contains('hidden')) {
        initTextPoints();
        // Opcional: Liberar partículas viejas para que busquen los nuevos puntos
        particles.forEach(p => { 
            if(p.mode === 'text') {
                p.target = null; 
                p.arrived = false;
            }
        });
    }
}
window.addEventListener('resize', resizeCanvas);
// Llamada inicial
W = canvas.width = window.innerWidth;
H = canvas.height = window.innerHeight;

// --- 1. PREPARAR PUNTOS DE TEXTO (RESPONSIVO) ---
function initTextPoints() {
    const buffer = document.createElement('canvas');
    buffer.width = W;
    buffer.height = H;
    const bCtx = buffer.getContext('2d');
    
    // --- CÁLCULO DINÁMICO DE FUENTE ---
    // En móvil (ej. 360px), la fuente será aprox 45px. En PC, máx 80px.
    let fontSize = Math.min(W * 0.14, 80); 
    // Ajuste mínimo para que no sea ilegible en pantallas muy pequeñas
    if (fontSize < 30) fontSize = 30;
    
    const fontStr = `${Math.floor(fontSize)}px "Pinyon Script", cursive`;
    
    bCtx.font = fontStr;
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    
    bCtx.strokeStyle = '#fff';
    bCtx.lineWidth = 3; 

    // Función de ajuste de línea (Word Wrap)
    function wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let line = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = line ? line + ' ' + words[i] : words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line) {
                lines.push(line);
                line = words[i];
            } else {
                line = testLine;
            }
        }
        if (line) lines.push(line);
        return lines;
    }

    // Margen seguro: 90% del ancho de pantalla
    const maxTextWidth = W * 0.90; 
    const lines = wrapText(bCtx, TARGET_TEXT, maxTextWidth);
    
    // Altura de línea proporcional al tamaño de fuente
    const lineHeight = fontSize * 1.3; 
    const blockHeight = lines.length * lineHeight;
    
    // Posición vertical:
    // En móvil, si hay muchas líneas, subimos un poco el bloque para que quepa bien.
    let verticalPos = 0.25; 
    if (W < 600) verticalPos = 0.3; // Un poco más centrado en móvil

    const centerY = H * verticalPos;
    let startY = centerY - blockHeight / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
        bCtx.strokeText(lines[i], W / 2, startY + i * lineHeight);
    }
    
    const data = bCtx.getImageData(0, 0, W, H).data;
    targetPoints = [];
    
    for (let y = 0; y < H; y += PARTICLE_DENSITY) {
        for (let x = 0; x < W; x += PARTICLE_DENSITY) {
            if (data[(y * W + x) * 4 + 3] > 100) {
                targetPoints.push({ x: x, y: y, taken: false });
            }
        }
    }
    targetPoints.sort(() => Math.random() - 0.5);
}

// --- 2. MOTOR MATEMÁTICO DE FORMAS ---
function getShapeVelocity(type, index, total, baseSpeed) {
    let angle, speed, vx, vy;
    switch (type) {
        case 'chrysanthemum':
            angle = (index * TWO_PI) / total;
            // A diferencia de la peonía (7 pétalos), el crisantemo tiene muchos (ej. 15 o 20)
            const densePetals = 15; 
            
            // Variación suave pero frecuente para crear la textura de "pompón"
            // 0.8 es el radio base, 0.2 es cuánto sobresalen los picos
            const chrysMod = 0.8 + 0.2 * Math.cos(angle * densePetals);
            
            speed = baseSpeed * chrysMod * 1.3; 
            
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
            break;
        case 'peony':
            // Peonía REAL: Una esfera perfecta y densa.
            // No usamos ondas (coseno) para pétalos, sino una expansión uniforme.
            angle = (index * TWO_PI) / total;
            
            // Para que se vea como la foto (una bola densa y no solo un anillo vacío),
            // variamos muy ligeramente la velocidad. Esto crea "capas" de profundidad.
            // Random entre 0.9 y 1.0 llena un poco el grosor de la esfera.
            const depth3D = Math.random() * 0.15 + 0.85; 
            
            speed = baseSpeed * depth3D;
            
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
            break;
        case 'doubleRing':
            angle = (index * TWO_PI) / total;
            speed = (index % 2 === 0) ? baseSpeed : baseSpeed * 0.6;
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
            break;
        case 'saturn':
            if (index < total * 0.3) {
                angle = Math.random() * TWO_PI;
                speed = Math.random() * (baseSpeed * 0.3); 
                vx = Math.cos(angle) * speed;
                vy = Math.sin(angle) * speed;
            } else {
                angle = (index / (total * 0.7)) * TWO_PI;
                speed = baseSpeed * 1.5; 
                vx = Math.cos(angle) * speed;
                vy = Math.sin(angle) * (speed * 0.3);
                const tilt = 0.5; 
                const oldVx = vx;
                vx = vx * Math.cos(tilt) - vy * Math.sin(tilt);
                vy = oldVx * Math.sin(tilt) + vy * Math.cos(tilt);
            }
            break;
        case 'spiral':
            const arms = 4; 
            const spinFactor = index * (TWO_PI * arms / total);
            angle = spinFactor;
            speed = (index / total) * baseSpeed * 1.2; 
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
            break;
        default:
            angle = Math.random() * TWO_PI;
            speed = Math.random() * baseSpeed;
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
            break;
    }
    return { vx, vy };
}

// --- 3. CLASE PARTÍCULA ---
class Particle {
    constructor(x, y, hue, mode, target, shapeType, index, totalParticles, baseVelocity) {
        this.x = x;
        this.y = y;
        this.hue = hue;
        this.mode = mode; 
        this.target = target;
        this.alpha = 1;
        this.friction = 0.96; 
        this.gravity = 0.06;  
        this.decay = Math.random() * 0.008 + 0.006;

        const velocity = getShapeVelocity(shapeType, index, totalParticles, baseVelocity);
        this.vx = velocity.vx;
        this.vy = velocity.vy;

        if (this.mode !== 'gravity') {
            this.arrived = false;
            this.delay = Math.random() * 35 + 15; 
            this.maxTravelSpeed = Math.random() * 4 + 3; 
            this.turnSpeed = 0.06; 
        }
    }

        update() {
        this.vx *= this.friction;
        this.vy *= this.friction;

        if (this.mode === 'gravity') {
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.decay;
        } else {
            // Si no hay target (p. ej. tras resize) evitar acceder a .x/.y y caer a modo gravity temporal
            if (!this.target) {
                // convertir en "gravity" temporal para que no rompa; mantiene comportamiento visual
                this.vy += this.gravity;
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= this.decay;
                return;
            }

            if(this.alpha > 0.1 && this.arrived) this.alpha -= 0.003;

            if (this.arrived) return;
            if (this.delay > 0) {
                this.delay--;
                this.vy += this.gravity;
                this.x += this.vx;
                this.y += this.vy;
            } else {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const distSq = dx*dx + dy*dy;
                if (distSq < 15) { 
                    this.arrived = true;
                    this.x = this.target.x;
                    this.y = this.target.y;
                    return;
                }
                const dist = Math.sqrt(distSq);
                const desiredVx = (dx / dist) * this.maxTravelSpeed;
                const desiredVy = (dy / dist) * this.maxTravelSpeed;
                const steerX = desiredVx - this.vx;
                const steerY = desiredVy - this.vy;
                this.vx += steerX * this.turnSpeed;
                this.vy += steerY * this.turnSpeed;
                this.x += this.vx;
                this.y += this.vy;
            }
        }
    }

    draw() {
        if (this.alpha <= 0) return;
        
        const lightness = this.arrived ? '80%' : '60%';
        ctx.fillStyle = `hsla(${this.hue}, 100%, ${lightness}, ${this.alpha})`;
        
        if (this.mode === 'gravity') {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            if (USE_CIRCLES) {
                ctx.beginPath();
                // Partículas más pequeñas si la pantalla es muy pequeña para definición
                let baseSize = W < 600 ? 1.0 : 1.2;
                const size = this.arrived ? baseSize : (baseSize * 2);
                ctx.arc(this.x, this.y, size, 0, TWO_PI);
                ctx.fill();
            } else {
                const size = this.arrived ? 2 : 3;
                ctx.fillRect(this.x, this.y, size, size);
            }
        }
    }
}

// --- 4. CLASE COHETE ---
class Firework {
    constructor() {
        this.x = Math.random() * W;
        this.y = H;
        
        // Ajustar altura objetivo según el dispositivo
        // En móvil, que no suban tanto porque el texto puede ocupar más espacio vertical
        const heightLimit = W < 600 ? 0.4 : 0.4; 
        this.targetY = Math.random() * (H * heightLimit) + (H * 0.1);
        
        const distToCenter = (W / 2) - this.x;
        this.vx = distToCenter * 0.005; 
        // Velocidad de subida ajustada para pantallas de diferentes alturas
        // H * 0.02 es una aproximación para que sea proporcional
        this.vy = -(Math.random() * 4 + 12); 
        this.gravity = 0.12;
        this.hue = Math.random() * 360;
        this.dead = false;
        
        const shapes = ['peony', 'chrysanthemum', 'doubleRing', 'saturn', 'spiral'];
        this.shapeType = shapes[Math.floor(Math.random() * shapes.length)];
    }

    update() {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        if (this.vy >= 0 || this.y <= this.targetY) {
            this.dead = true;
            this.explode();
        }
    }

    explode() {
        const count = EXPLOSION_COUNT; 
        const textCount = Math.floor(count * 0.4); 
        // Velocidad de explosión un poco menor en móviles para que no se salgan de pantalla
        let velocityFactor = W < 600 ? 0.8 : 1.0;
        const baseVelocity = (Math.random() * 6 + 9) * velocityFactor; 

        for (let i = 0; i < count; i++) {
            let target = null;
            let mode = 'gravity';
            if (i < textCount) {
                const t = targetPoints.find(p => !p.taken);
                if (t) {
                    t.taken = true;
                    target = t;
                    mode = 'text';
                }
            }
            particles.push(new Particle(this.x, this.y, this.hue, mode, target, this.shapeType, i, count, baseVelocity));
        }
    }

    draw() {
        ctx.fillStyle = `hsl(${this.hue}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, TWO_PI); 
        ctx.fill();
    }
}

// --- BUCLE PRINCIPAL ---
let isAnimating = false;
let timer = 0;

function animate() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';

    if (timer % 25 === 0) { 
        fireworks.push(new Firework());
    }
    timer++;

    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw();
        if (fireworks[i].dead) fireworks.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0) {
            if (particles[i].target) {
                particles[i].target.taken = false;
            }
            particles.splice(i, 1);
        }
    }

    requestAnimationFrame(animate);
}

// --- LÓGICA DE TRANSICIÓN FINAL ---
botonPortada.addEventListener('click', () => {
    // 1. Iniciar la transición de la portada
    portada.classList.add('fade-out');
    
    // 2. Esperar 3 segundos (3000ms) para que termine la transición
    setTimeout(() => {
        // 3. Mostrar el contenedor de la sorpresa
        sorpresaContainer.classList.add('show');
        
        // 4. Iniciar la música y la animación
        initTextPoints();
        audio.play().catch(e => console.log("Audio bloqueado:", e));
        
        if (!isAnimating) {
            isAnimating = true;
            animate();
        }
        
        // (Opcional) Eliminar la portada del DOM después de que se oculte
        setTimeout(() => {
            portada.remove();
        }, 1000);

    }, 3000); // Tiempo de espera = duración de la transición CSS
});