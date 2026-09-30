(() => {
  const form = document.querySelector('#checkout-form');
  const generate = document.querySelector('#generate');
  const error = document.querySelector('#error');
  const result = document.querySelector('#pix-result');
  let pollTimer;

  document.querySelector('#copy-pix').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(document.querySelector('#pix-code').value);
      button.textContent = 'Copiado!';
      setTimeout(() => { button.textContent = 'Copiar'; }, 1800);
    } catch {
      document.querySelector('#pix-code').select();
      document.execCommand('copy');
      button.textContent = 'Copiado!';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    generate.disabled = true;
    generate.textContent = 'Gerando Pix…';
    try {
      const response = await fetch('/api/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'apoio_privacidade', name: form.elements.name.value, email: form.elements.email.value }),
      });
      const data = await response.json();
      if (!response.ok || !data.pix_code || !data.identifier) throw new Error(data.error || 'Não foi possível gerar o Pix. Tente novamente.');
      document.querySelector('#qr').src = data.qr_code_base64;
      document.querySelector('#pix-code').value = data.pix_code;
      result.hidden = false;
      clearInterval(pollTimer);
      pollTimer = setInterval(() => checkPayment(data.identifier), 5000);
      checkPayment(data.identifier);
    } catch (err) {
      error.textContent = err.message || 'Falha de conexão. Tente novamente.';
    } finally {
      generate.disabled = false;
      generate.textContent = 'Gerar Pix';
    }
  });

  async function checkPayment(identifier) {
    try {
      const response = await fetch(`/api/payment-status?identifier=${encodeURIComponent(identifier)}`);
      const data = await response.json();
      if (data.status === 'paid') {
        clearInterval(pollTimer);
        document.querySelector('#payment-status').textContent = 'Pagamento confirmado.';
        const delivery = document.querySelector('#delivery-result');
        const productLink = document.querySelector('#product-link');
        const deliveryNote = document.querySelector('#delivery-note');
        delivery.hidden = false;
        if (data.access_url) {
          productLink.href = data.access_url;
          productLink.hidden = false;
          deliveryNote.hidden = true;
        } else {
          productLink.hidden = true;
          deliveryNote.textContent = 'O pagamento foi confirmado, mas o link do produto ainda não foi configurado. Fale com o vendedor para receber seu acesso.';
          deliveryNote.hidden = false;
        }
      } else if (data.status === 'failed') {
        clearInterval(pollTimer);
        document.querySelector('#payment-status').textContent = 'Pix expirado ou não concluído. Gere outro pagamento.';
      }
    } catch { /* A próxima consulta tenta novamente. */ }
  }
})();
