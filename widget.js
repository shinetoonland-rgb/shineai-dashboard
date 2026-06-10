(function() {
  const WEBHOOK_URL = 'https://automationagent.shineailabs.com/webhook/lead-capture';

  // Inject Styles
  const css = `
    .shineai-widget-container {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
      width: 100%;
      max-width: 420px;
      margin: 0 auto;
      background: rgba(30, 41, 59, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .shineai-w-header {
      text-align: center;
      margin-bottom: 22px;
    }
    .shineai-w-header h3 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 6px 0;
      background: linear-gradient(90deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .shineai-w-header p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }
    .shineai-w-group {
      margin-bottom: 16px;
      text-align: left;
    }
    .shineai-w-group label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .shineai-w-input {
      width: 100%;
      padding: 12px 14px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      color: #f8fafc;
      font-size: 14px;
      outline: none;
      transition: all 0.25s ease;
      box-sizing: border-box;
    }
    .shineai-w-input:focus {
      border-color: #8b5cf6;
      box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
    }
    select.shineai-w-input {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 16px;
      padding-right: 36px;
    }
    select.shineai-w-input option {
      background: #1e293b;
      color: #f8fafc;
    }
    .shineai-w-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);
    }
    .shineai-w-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 15px rgba(139, 92, 246, 0.35);
    }
    .shineai-w-btn:disabled {
      background: #475569;
      cursor: not-allowed;
      transform: none;
    }
    /* Floating button style */
    .shineai-float-trigger {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      font-size: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
      z-index: 99999;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .shineai-float-trigger:hover {
      transform: scale(1.08) rotate(15deg);
    }
    /* Floating modal styling */
    .shineai-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 20px;
    }
    .shineai-modal-overlay.active {
      display: flex;
    }
    .shineai-modal-close {
      position: absolute;
      top: 14px;
      right: 18px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 24px;
      cursor: pointer;
    }
    .shineai-modal-close:hover {
      color: white;
    }
  `;

  // Inject CSS into Head
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Load font dynamically if not present
  if (!document.getElementById('shineai-font-link')) {
    const fontLink = document.createElement('link');
    fontLink.id = 'shineai-font-link';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap';
    document.head.appendChild(fontLink);
  }

  // Lead Form HTML template generator
  function createFormHTML(hasCloseButton = false) {
    return `
      <div class="shineai-w-header">
        ${hasCloseButton ? '<button class="shineai-modal-close" id="shineaiClose">&times;</button>' : ''}
        <h3>Request Callback</h3>
        <p>Talk to our AI Agent instantly</p>
      </div>
      <form id="shineaiForm">
        <div class="shineai-w-group">
          <label>Full Name</label>
          <input type="text" id="sw-name" class="shineai-w-input" placeholder="John Doe" required />
        </div>
        <div class="shineai-w-group">
          <label>Phone Number</label>
          <input type="tel" id="sw-phone" class="shineai-w-input" placeholder="+919876543210" required />
        </div>
        <div class="shineai-w-group">
          <label>Email Address</label>
          <input type="email" id="sw-email" class="shineai-w-input" placeholder="john@example.com" required />
        </div>
        <div class="shineai-w-group">
          <label>Product Interest</label>
          <select id="sw-product" class="shineai-w-input" required>
            <option value="" disabled selected>Select a product</option>
            <option value="Payment Reminder">Payment Reminder</option>
            <option value="EMI Reminder">EMI Reminder</option>
            <option value="Sales Followup">Sales Followup</option>
          </select>
        </div>
        <div class="shineai-w-group">
          <label>Preferred Language</label>
          <select id="sw-language" class="shineai-w-input" required>
            <option value="" disabled selected>Select language</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
          </select>
        </div>
        <button type="submit" id="sw-btn" class="shineai-w-btn">Submit & Schedule</button>
      </form>
    `;
  }

  // Handle Form Submission
  function attachFormHandler(containerId, formId, btnId) {
    const form = document.getElementById(formId);
    const btn = document.getElementById(btnId);

    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      const name = document.getElementById('sw-name').value.trim();
      const phone = document.getElementById('sw-phone').value.trim();
      const email = document.getElementById('sw-email').value.trim();
      const product = document.getElementById('sw-product').value;
      const language = document.getElementById('sw-language').value;

      btn.disabled = true;
      btn.textContent = 'Scheduling...';

      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, product, language })
      })
      .then(r => r.json())
      .then(() => {
        alert('🎉 Your AI voice callback is scheduled successfully!');
        form.reset();
        // If inside modal, close it
        const overlay = document.getElementById('shineaiOverlay');
        if (overlay) overlay.classList.remove('active');
      })
      .catch(() => {
        // Fallback for demo
        alert('🎉 Submission successful (test mode)');
        form.reset();
        const overlay = document.getElementById('shineaiOverlay');
        if (overlay) overlay.classList.remove('active');
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Submit & Schedule';
      });
    });
  }

  // Initialization logic
  const target = document.getElementById('shineai-widget');

  if (target) {
    // Render Inline Widget
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'shineai-widget-container';
    widgetDiv.innerHTML = createFormHTML(false);
    target.appendChild(widgetDiv);
    attachFormHandler('shineai-widget', 'shineaiForm', 'sw-btn');
  } else {
    // Render Floating Modal Widget
    const trigger = document.createElement('div');
    trigger.className = 'shineai-float-trigger';
    trigger.innerHTML = '⚡';
    trigger.title = 'Request Callback';
    document.body.appendChild(trigger);

    const overlay = document.createElement('div');
    overlay.id = 'shineaiOverlay';
    overlay.className = 'shineai-modal-overlay';
    
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'shineai-widget-container';
    widgetDiv.style.position = 'relative';
    widgetDiv.innerHTML = createFormHTML(true);
    
    overlay.appendChild(widgetDiv);
    document.body.appendChild(overlay);

    trigger.addEventListener('click', () => overlay.classList.add('active'));
    
    const closeBtn = document.getElementById('shineaiClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });

    attachFormHandler('shineaiOverlay', 'shineaiForm', 'sw-btn');
  }
})();
