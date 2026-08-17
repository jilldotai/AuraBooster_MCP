/* app.js — J.I.L.L. demo form handler */
const form = document.getElementById('demoForm');
const submitBtn = document.getElementById('demoSubmit');
const submitLabel = document.getElementById('demoSubmitLabel');
const submitSpinner = document.getElementById('demoSubmitSpinner');
const formStatus = document.getElementById('formStatus');
const quoteResult = document.getElementById('quoteResult');
const quoteDetails = document.getElementById('quoteDetails');
const pdfLink = document.getElementById('pdfLink');
const approveBtn = document.getElementById('approveBtn');
const approveStatus = document.getElementById('approveStatus');

let currentQuoteId = null;

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitLabel.hidden = loading;
  submitSpinner.hidden = !loading;
}

function setStatus(msg, type = '') {
  formStatus.textContent = msg;
  formStatus.className = 'form-status' + (type ? ' ' + type : '');
}

function renderQuote(quote, id) {
  const items = quote.lineItems.map(item => {
    const amount = item.unitPrice === 0
      ? `<span class="muted">confirm price</span>`
      : `${quote.currency} ${(item.quantity * item.unitPrice).toFixed(2)}`;
    return `<tr><td>${item.description}${item.quantity !== 1 ? ` × ${item.quantity}` : ''}</td><td>${amount}</td></tr>`;
  }).join('');

  const total = quote.lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  quoteDetails.innerHTML = `
    <p style="margin-bottom:1rem;color:var(--text-muted);font-size:0.82rem;font-family:var(--font-mono);">
      DEMO / PRO FORMA — ${id} — ${quote.businessName}
    </p>
    <table>
      <thead><tr><th>Description</th><th>Amount</th></tr></thead>
      <tbody>${items}</tbody>
      <tfoot>
        <tr class="total-row"><td><strong>Total</strong></td><td>${quote.currency} ${total.toFixed(2)}</td></tr>
        ${quote.depositPercent > 0 ? `<tr class="total-row"><td>Deposit (${quote.depositPercent}%)</td><td>${quote.currency} ${(total * quote.depositPercent / 100).toFixed(2)}</td></tr>` : ''}
      </tfoot>
    </table>
    ${quote.notes ? `<p style="margin-top:1rem;font-size:0.82rem;color:var(--text-muted);">${quote.notes}</p>` : ''}
  `;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('');
  setLoading(true);

  const data = Object.fromEntries(new FormData(form));
  data.optedIn = true;

  try {
    const res = await fetch('/api/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.formErrors?.[0] || JSON.stringify(json.error) || 'Something went wrong.');

    currentQuoteId = json.id;
    renderQuote(json.quote, json.id);
    pdfLink.href = json.pdfUrl;
    quoteResult.hidden = false;
    quoteResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.reset();
    setStatus('Quote draft created! Review it below.', 'success');
  } catch (err) {
    setStatus(err.message || 'Failed to create quote. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});

approveBtn?.addEventListener('click', async () => {
  if (!currentQuoteId) return;
  approveBtn.disabled = true;
  approveStatus.textContent = 'Approving…';
  approveStatus.className = 'form-status';

  try {
    const res = await fetch(`/api/quotes/${currentQuoteId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Approval failed.');

    if (json.eftFallbackConfigured) {
      approveStatus.textContent = '✓ Approved! EFT payment details will be included when you send this quote to your customer.';
    } else {
      approveStatus.textContent = '✓ Quote approved! Contact hello@jill.ltd to connect your payment details.';
    }
    approveStatus.className = 'form-status success';
  } catch (err) {
    approveStatus.textContent = err.message;
    approveStatus.className = 'form-status error';
    approveBtn.disabled = false;
  }
});
