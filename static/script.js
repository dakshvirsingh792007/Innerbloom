document.addEventListener('DOMContentLoaded', () => {
    // Highlight active sidebar link
    const currentPath = window.location.pathname;
    const sidebarLinks = document.querySelectorAll('.sidebar a, .icon-sidebar a'); // Updated selector
    sidebarLinks.forEach(link => {
        // Remove active class from all parents
        let parent = link.parentElement;
        while (parent) {
            parent.classList.remove('active');
            parent = parent.parentElement;
        }

        if (link.getAttribute('href') === currentPath) {
            link.parentElement.classList.add('active'); // Add active class to the LI element
        }
    });

    // Sidebar toggle functionality
    const sidebar = document.querySelector('.icon-sidebar');
    const toggleButton = document.getElementById('sidebar-toggle');

    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.toggle('sidebar-expanded');
        });
    }


    const userInfoForm = document.getElementById('userInfoForm');
    const chatContainer = document.querySelector('.chat-container');
    let userInfo = {};

    if (userInfoForm) {
        userInfoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const age = document.getElementById('age').value;
            const interest = document.getElementById('interest').value;
            userInfo = { age, area_of_interest: interest };

            document.querySelector('.user-info-form-container').style.display = 'none';
            chatContainer.style.display = 'flex';
        });
    }

    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');

    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    async function sendMessage() {
        const prompt = userInput.value.trim();
        if (!prompt) return;

        appendMessage(prompt, 'user-message', chatBox);
        userInput.value = '';

        const startTime = Date.now();
        showTypingIndicator(chatBox);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: prompt, user_info: userInfo })
            });

            const data = await response.json();
            
            const elapsedTime = Date.now() - startTime;
            const minimumDelay = 1000; // 1 second
            const remainingDelay = Math.max(0, minimumDelay - elapsedTime);

            setTimeout(() => {
                removeTypingIndicator(chatBox);
                if (response.ok) {
                    appendMessage(data.response, 'ai-message', chatBox);
                } else {
                    appendMessage(`Error: ${data.error}`, 'ai-message', chatBox);
                }
            }, remainingDelay);

        } catch (error) {
            console.error('Error fetching AI response:', error);
            // Ensure indicator is removed even if fetch fails
            setTimeout(() => {
                removeTypingIndicator(chatBox);
                appendMessage('An unexpected error occurred.', 'ai-message', chatBox);
            }, 1000); // Wait even on error to avoid jarring UI
        }
    }

    function appendMessage(message, className, targetBox) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', className);
        messageElement.innerHTML = `<p>${message}</p>`;
        targetBox.appendChild(messageElement);
        targetBox.scrollTop = targetBox.scrollHeight;
    }

    function showTypingIndicator(targetBox) {
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('chat-message', 'ai-message', 'typing-indicator');
        typingIndicator.innerHTML = `
            <div class="wave-container">
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
            </div>`;
        targetBox.appendChild(typingIndicator);
        targetBox.scrollTop = targetBox.scrollHeight;
    }

    function removeTypingIndicator(targetBox) {
        const typingIndicator = targetBox.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    
});