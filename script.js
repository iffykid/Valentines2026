document.addEventListener('DOMContentLoaded', () => {
    let config = {};
    let loveLevel = 0;
    const totalQuestions = 3; // Will be updated from config
    const answeredParams = new Set(); // Track answered question IDs

    // DOM Elements
    const container = document.getElementById('polaroid-container');
    const loveMeter = document.getElementById('love-meter');
    const lovePercentage = document.getElementById('love-percentage');
    const questionModal = document.getElementById('question-modal');
    const modalQuestion = document.getElementById('modal-question');
    const modalOptions = document.getElementById('modal-options');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const proposalPopup = document.getElementById('proposal-popup');
    const moreOptionsBtn = document.getElementById('more-options-btn');
    const toast = document.getElementById('toast');
    const btns = document.querySelectorAll('.btn[data-response]');

    // Initialize
    fetch('config.json')
        .then(response => response.json())
        .then(data => {
            config = data;
            initApp();
        })
        .catch(err => console.error('Error loading config:', err));

    // Password Logic
    const passwordOverlay = document.getElementById('password-overlay');
    const passwordInput = document.getElementById('password-input');
    const passwordSubmitBtn = document.getElementById('password-submit-btn');
    const passwordError = document.getElementById('password-error');

    function checkPassword() {
        const entered = passwordInput.value;
        if (entered === config.password) {
            passwordOverlay.classList.add('hidden');
        } else {
            passwordError.classList.remove('hidden');
            passwordInput.classList.add('shake'); // CSS class exists or we can add inline animation logic
            setTimeout(() => {
                passwordInput.classList.remove('shake');
            }, 500);
        }
    }

    passwordSubmitBtn.addEventListener('click', checkPassword);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPassword();
    });

    function initApp() {
        // Render Polaroids
        config.questions.forEach((q, index) => {
            const polaroid = document.createElement('div');
            polaroid.className = 'polaroid';
            // Alternating rotations handled by CSS nth-child, or random here:
            // const rotation = (Math.random() * 6 - 3).toFixed(1);
            // polaroid.style.transform = `rotate(${rotation}deg)`;

            polaroid.innerHTML = `
                <img src="${q.image}" alt="Memory ${index + 1}">
                <div class="polaroid-caption" id="caption-${q.id}">Click Here</div>
            `;

            polaroid.addEventListener('click', () => openQuestion(q, polaroid));
            container.appendChild(polaroid);
        });

        // Setup Proposal Buttons
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.response; // yes, obviously, yesCaps
                sendWhatsapp(type);
            });
        });

        moreOptionsBtn.addEventListener('click', showToast);
        modalCloseBtn.addEventListener('click', closeQuestionModal);
    }

    function openQuestion(questionObj, polaroidEl) {
        if (answeredParams.has(questionObj.id)) return; // Already answered

        modalQuestion.innerText = `${questionObj.question}`; // Removed ID prefix for cleaner look
        modalOptions.innerHTML = ''; // Clear previous

        questionObj.options.forEach((opt, idx) => {
            const btn = document.createElement('div');
            btn.className = 'option-btn';
            btn.innerText = opt;
            btn.addEventListener('click', () => handleAnswer(questionObj, idx, btn, polaroidEl));
            modalOptions.appendChild(btn);
        });

        questionModal.classList.add('visible');
    }

    function closeQuestionModal() {
        questionModal.classList.remove('visible');
    }

    function handleAnswer(questionObj, selectedIdx, btnElement, polaroidEl) {
        // Highlight selection
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btnElement.classList.add('selected');

        // Create a 'Done' button if not exists or auto-submit
        // Let's add a small delay then check correctness
        setTimeout(() => {
            const isCorrect = selectedIdx === questionObj.correctAnswer;

            if (isCorrect) {
                // Update Love Meter
                answeredParams.add(questionObj.id);
                updateLoveMeter();
                closeQuestionModal();

                // Hide caption on polaroid as requested
                const caption = polaroidEl.querySelector('.polaroid-caption');
                if (caption) {
                    caption.style.opacity = '0'; // Fade out
                    // Also make it unclickable cursor
                    polaroidEl.style.cursor = 'default';
                }

            } else {
                btnElement.classList.add('shake');
                btnElement.style.borderColor = 'red';
                setTimeout(() => btnElement.classList.remove('shake'), 400);
            }
        }, 500);
    }

    function updateLoveMeter() {
        const progressPerQuestion = 100 / config.questions.length;
        loveLevel += progressPerQuestion;

        // Cap at 100
        if (loveLevel > 99) loveLevel = 100;

        loveMeter.style.width = `${loveLevel}%`;
        lovePercentage.innerText = `${Math.round(loveLevel)}%`;

        if (Math.round(loveLevel) === 100) {
            setTimeout(() => {
                triggerProposal();
            }, 1000); // 1 sec delay to enjoy the 100%
        }
    }

    function triggerProposal() {
        proposalPopup.classList.remove('hidden');
        startConfetti();
    }

    function sendWhatsapp(responseType) {
        const message = config.messages[responseType];
        const number = config.whatsappNumber;
        const encodedMsg = encodeURIComponent(message);
        const url = `https://wa.me/${number}?text=${encodedMsg}`;
        window.location.href = url;
    }

    let optionClickCount = 0;

    function showToast() {
        const angryMessages = config.messages.angryOptions;
        const finalMessage = config.messages.finalOptionMessage;

        let msg = "";

        if (optionClickCount < angryMessages.length) {
            msg = angryMessages[optionClickCount];
            optionClickCount++;
        } else {
            msg = finalMessage;
            moreOptionsBtn.style.display = 'none'; // Hide the button
        }

        toast.innerText = msg;
        toast.classList.remove('hidden');

        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // Simple Canvas Confetti
    function startConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#FC033D', '#B103A4', '#FFD700', '#FFFFFF'];

        function Particle() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height - canvas.height;
            this.size = Math.random() * 8 + 4;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.speedY = Math.random() * 3 + 2;
            this.speedX = Math.random() * 2 - 1;
            this.rotation = Math.random() * 360;
            this.rotationSpeed = Math.random() * 5 - 2.5;
        }

        Particle.prototype.update = function () {
            this.y += this.speedY;
            this.x += this.speedX;
            this.rotation += this.rotationSpeed;

            if (this.y > canvas.height) {
                this.y = -20;
                this.x = Math.random() * canvas.width;
            }
        };

        Particle.prototype.draw = function () {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate((this.rotation * Math.PI) / 180);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        };

        function initParticles() {
            for (let i = 0; i < 100; i++) {
                particles.push(new Particle());
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }

        initParticles();
        animate();

        // Handle resize
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }
});
