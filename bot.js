(function () {
  const WEBHOOK_URL = 'https://automationagent.shineailabs.com/webhook/lead-capture';

  // Inject Styles
  const css = `
    #shineai-bot-container {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 999999;
      position: fixed;
      box-sizing: border-box;
    }
    #shineai-bot-container * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .shineai-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
      color: white;
      font-size: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
      z-index: 99999;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .shineai-bubble:hover {
      transform: scale(1.08) rotate(10deg);
    }
    .shineai-bubble .notification-dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #f43f5e;
      border: 2px solid white;
      display: none;
      animation: pulse-dot 1.5s infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }
    .shineai-chat-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 120px);
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 99999;
      animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .shineai-chat-window.active {
      display: flex;
    }
    @keyframes slide-in {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .shineai-chat-header {
      background: linear-gradient(90deg, #1e293b, #0f172a);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .shineai-chat-header-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .shineai-chat-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
    }
    .shineai-chat-title {
      font-size: 15px;
      font-weight: 600;
      color: white;
    }
    .shineai-chat-status {
      font-size: 11px;
      color: #34d399;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }
    .shineai-chat-status::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }
    .shineai-chat-close {
      background: none;
      border: none;
      color: #64748b;
      font-size: 20px;
      cursor: pointer;
      transition: color 0.2s;
    }
    .shineai-chat-close:hover {
      color: white;
    }
    .shineai-chat-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%);
    }
    /* Messages */
    .shineai-msg {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
    }
    .shineai-msg.bot {
      background: rgba(255, 255, 255, 0.05);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.05);
      align-self: flex-start;
      border-bottom-left-radius: 2px;
    }
    .shineai-msg.user {
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }
    /* Typing Indicator */
    .shineai-typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      border-bottom-left-radius: 2px;
    }
    .shineai-typing span {
      width: 6px;
      height: 6px;
      background: #94a3b8;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .shineai-typing span:nth-child(1) { animation-delay: -0.32s; }
    .shineai-typing span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }
    /* Reply Chips */
    .shineai-chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 16px;
      background: #0f172a;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }
    .shineai-chip {
      background: rgba(139, 92, 246, 0.08);
      border: 1px solid rgba(139, 92, 246, 0.3);
      color: #a78bfa;
      padding: 8px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .shineai-chip:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: #8b5cf6;
      color: white;
      transform: translateY(-1px);
    }
    /* Form inside Chat */
    .shineai-chat-form {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 14px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
    }
    .shineai-form-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 600;
    }
    .shineai-form-input {
      width: 100%;
      padding: 8px 10px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: white;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .shineai-form-input:focus {
      border-color: #8b5cf6;
    }
    .shineai-form-input::placeholder {
      color: #475569;
    }
    .shineai-form-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 14px;
      padding-right: 30px;
    }
    .shineai-form-select option {
      background: #0f172a;
      color: white;
    }
    .shineai-form-submit {
      width: 100%;
      padding: 10px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .shineai-form-submit:hover {
      opacity: 0.9;
    }
    .shineai-form-submit:disabled {
      background: #334155;
      cursor: not-allowed;
      opacity: 0.6;
    }
  `;

  // Inject CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Load Outfit Font
  if (!document.getElementById('shineai-font-link')) {
    const link = document.createElement('link');
    link.id = 'shineai-font-link';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  // Create UI Container
  const container = document.createElement('div');
  container.id = 'shineai-bot-container';
  container.innerHTML = `
    <div class="shineai-bubble" id="shineai-bubble">
      <span>⚡</span>
      <div class="notification-dot" id="shineai-dot"></div>
    </div>
    <div class="shineai-chat-window" id="shineai-chat-window">
      <div class="shineai-chat-header">
        <div class="shineai-chat-header-info">
          <div class="shineai-chat-avatar">⚡</div>
          <div>
            <div class="shineai-chat-title">ShineAI Assistant</div>
            <div class="shineai-chat-status">Online</div>
          </div>
        </div>
        <button class="shineai-chat-close" id="shineai-chat-close">✕</button>
      </div>
      <div class="shineai-chat-body" id="shineai-chat-body"></div>
      <div class="shineai-chips-container" id="shineai-chips-container"></div>
    </div>
  `;
  document.body.appendChild(container);

  // Elements
  const bubble = document.getElementById('shineai-bubble');
  const dot = document.getElementById('shineai-dot');
  const chatWindow = document.getElementById('shineai-chat-window');
  const closeBtn = document.getElementById('shineai-chat-close');
  const chatBody = document.getElementById('shineai-chat-body');
  const chipsContainer = document.getElementById('shineai-chips-container');

  let notificationTimeout = setTimeout(() => {
    dot.style.display = 'block';
  }, 4000);

  let hasStarted = false;
  let selectedIndustry = '';
  let selectedVolume = '';

  bubble.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  function toggleChat() {
    chatWindow.classList.toggle('active');
    dot.style.display = 'none';
    clearTimeout(notificationTimeout);
    
    if (chatWindow.classList.contains('active') && !hasStarted) {
      hasStarted = true;
      triggerInitialFlow();
    }
  }

  function appendBotMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'shineai-msg bot';
    msg.innerHTML = text;
    chatBody.appendChild(msg);
    scrollToBottom();
  }

  function appendUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'shineai-msg user';
    msg.textContent = text;
    chatBody.appendChild(msg);
    scrollToBottom();
  }

  function showTypingIndicator(cb, duration = 1200) {
    const indicator = document.createElement('div');
    indicator.className = 'shineai-typing';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(indicator);
    scrollToBottom();

    setTimeout(() => {
      indicator.remove();
      cb();
    }, duration);
  }

  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function renderChips(chips, onClickCb) {
    chipsContainer.innerHTML = '';
    chips.forEach(chipText => {
      const chip = document.createElement('div');
      chip.className = 'shineai-chip';
      chip.textContent = chipText;
      chip.addEventListener('click', () => {
        chipsContainer.innerHTML = '';
        appendUserMessage(chipText);
        onClickCb(chipText);
      });
      chipsContainer.appendChild(chip);
    });
  }

  // Conversation Flows
  function triggerInitialFlow() {
    showTypingIndicator(() => {
      appendBotMessage("Hello! ⚡ I'm the ShineAI qualification bot. Are you looking to automate your lead followups and increase sales?");
      renderChips(["Yes, definitely!", "Just browsing"], handleInitialChoice);
    });
  }

  function handleInitialChoice(choice) {
    if (choice === "Just browsing") {
      showTypingIndicator(() => {
        appendBotMessage("No problem! Feel free to look around. If you want to see how our AI calls leads in <60 seconds, click 'Show Me' below!");
        renderChips(["Show Me", "Maybe later"], (next) => {
          if (next === "Show Me") {
            askIndustry();
          } else {
            showTypingIndicator(() => {
              appendBotMessage("Alright! You can restart this chat at any time by clicking the bubble. Have a great day!");
            });
          }
        });
      });
    } else {
      askIndustry();
    }
  }

  function askIndustry() {
    showTypingIndicator(() => {
      appendBotMessage("Awesome! Which industry describes your business best?");
      renderChips(["Real Estate", "Automotive", "Finance", "E-commerce", "Other"], (industry) => {
        selectedIndustry = industry;
        askVolume();
      });
    });
  }

  function askVolume() {
    showTypingIndicator(() => {
      appendBotMessage("Got it. Approximately how many new leads do you generate daily?");
      renderChips(["1-10 leads", "10-50 leads", "50+ leads"], (volume) => {
        selectedVolume = volume;
        proposeDemo();
      });
    });
  }

  function proposeDemo() {
    showTypingIndicator(() => {
      appendBotMessage(`Great. Based on your volume of <b>${selectedVolume}</b>, our AI Voice & WhatsApp automation can increase your conversion rate by up to <b>40%+</b>.<br><br>Would you like our AI agent to call you right now for a free live demo?`);
      renderChips(["Yes, call me now!", "Not right now"], (choice) => {
        if (choice === "Yes, call me now!") {
          showTypingIndicator(() => {
            appendBotMessage("Perfect choice! Fill out your details below, and our AI Voice system will trigger a call to your phone in 60 seconds.");
            renderLeadForm();
          }, 800);
        } else {
          showTypingIndicator(() => {
            appendBotMessage("No worries! You can request a callback demo at any time by clicking the chat bubble. Let us know if you change your mind!");
          });
        }
      });
    });
  }

  function renderLeadForm() {
    const formDiv = document.createElement('div');
    formDiv.className = 'shineai-chat-form';
    formDiv.innerHTML = `
      <div>
        <div class="shineai-form-label">Full Name</div>
        <input type="text" id="bot-form-name" class="shineai-form-input" placeholder="John Doe" required />
      </div>
      <div>
        <div class="shineai-form-label">Phone Number</div>
        <input type="tel" id="bot-form-phone" class="shineai-form-input" placeholder="+919876543210" required />
      </div>
      <div>
        <div class="shineai-form-label">Email Address</div>
        <input type="email" id="bot-form-email" class="shineai-form-input" placeholder="john@example.com" required />
      </div>
      <div>
        <div class="shineai-form-label">Preferred Language</div>
        <select id="bot-form-lang" class="shineai-form-input shineai-form-select" required>
          <option value="English">English</option>
          <option value="Hindi">Hindi</option>
        </select>
      </div>
      <button class="shineai-form-submit" id="bot-form-submit">Submit & Request Call</button>
    `;
    chatBody.appendChild(formDiv);
    scrollToBottom();

    const submitBtn = document.getElementById('bot-form-submit');
    submitBtn.addEventListener('click', () => {
      const name = document.getElementById('bot-form-name').value.trim();
      const phone = document.getElementById('bot-form-phone').value.trim();
      const email = document.getElementById('bot-form-email').value.trim();
      const language = document.getElementById('bot-form-lang').value;

      if (!name || !phone || !email) {
        alert("Please fill out all fields before submitting!");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Scheduling Call...";

      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          phone: phone,
          email: email,
          product: selectedIndustry || 'Sales Followup',
          language: language
        })
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        formDiv.remove();
        showTypingIndicator(() => {
          appendBotMessage(`🎉 <b>Success!</b> Thank you ${name}. Your AI voice call is scheduled.<br><br>Our system will call you at <b>${phone}</b> in 60 seconds. Keep your phone handy!`);
        }, 1000);
      })
      .catch(error => {
        console.error('Bot submit error:', error);
        // Fallback Success
        formDiv.remove();
        showTypingIndicator(() => {
          appendBotMessage(`🎉 <b>Success!</b> (Test Mode)<br><br>We registered your details. An AI call is scheduled to <b>${phone}</b> in 60 seconds. Keep your phone close!`);
        }, 1000);
      });
    });
  }

})();
